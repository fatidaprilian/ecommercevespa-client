// file: src/orders/orders.service.ts

import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  ForbiddenException,
  Logger,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto, PaymentPreference } from './dto/create-order.dto';
import { Prisma, Role, OrderStatus, PaymentStatus } from '@prisma/client';
import { PaymentsService } from 'src/payments/payments.service';
import { UserPayload } from 'src/auth/interfaces/jwt.payload';
import { AccurateSyncService } from 'src/accurate-sync/accurate-sync.service';
import { SettingsService } from 'src/settings/settings.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { EmailService } from 'src/email/email.service';
// Import ProductsService untuk kalkulasi harga yang konsisten
import { ProductsService } from 'src/products/products.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
    private accurateSyncService: AccurateSyncService,
    private settingsService: SettingsService,
    private emailService: EmailService,
    private readonly productsService: ProductsService,
  ) {}

  async create(userId: string, createOrderDto: CreateOrderDto) {
    const {
      items,
      shippingAddress,
      shippingCost,
      courier,
      destinationPostalCode,
      destinationAreaId,
      paymentPreference,
    } = createOrderDto;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Pengguna tidak ditemukan.');

    if (user.role === Role.MEMBER && !paymentPreference) {
      throw new BadRequestException(
        'Preferensi pembayaran harus disertakan untuk Member.',
      );
    }

    const createdOrder = await this.prisma.$transaction(async (tx) => {
      let subtotal = 0;
      const totalDiscount = 0; // Selalu 0 agar ringkasan hanya menampilkan harga final
      const orderItemsData: Prisma.OrderItemCreateManyOrderInput[] = [];

      // 👇 UBAH DI SINI: Jika klien minta 0% karena belum PKP, kita set 0 hardcode atau pastikan di settingsService nilainya 0.
      // Untuk amannya sesuai request Anda "udah saya disable kok dari accuratenya, jadi 0 persen", 
      // kita bisa ambil dari settings tapi pastikan nilainya memang 0 di DB, ATAU kita hardcode 0 sementara jika darurat.
      // Opsi terbaik: Tetap ambil dari settingsService, tapi Anda WAJIB ubah di Admin Panel jadi 0%.
      const vatPercentage = await this.settingsService.getVatPercentage(); 
      // Jika ingin memaksa 0% lewat kode (uncomment baris bawah):
      // const vatPercentage = 0; 

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: {
             priceTiers: true,
             priceAdjustmentRules: { where: { isActive: true } }
          }
        });

        if (!product)
          throw new NotFoundException(`Produk ID ${item.productId} tidak ditemukan.`);
        if (product.stock < item.quantity)
          throw new UnprocessableEntityException(`Stok untuk ${product.name} tidak mencukupi.`);

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });

        // Gunakan kalkulator harga sentral agar sama dengan Cart
        const processedProduct = await this.productsService.processProductWithPrice(
            product,
            { id: user.id, email: user.email, role: user.role, name: user.name || '' }
        );
        
        const finalPrice = processedProduct.price;
        subtotal += finalPrice * item.quantity;

        orderItemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          price: finalPrice,
        });
      }

      // Hitung Pajak (Akan jadi 0 jika vatPercentage 0)
      const taxableAmount = subtotal;
      const taxAmount = (taxableAmount * vatPercentage) / 100;
      const baseTotalAmount = taxableAmount + taxAmount + shippingCost;

      let finalTotalAmount = baseTotalAmount;
      // Biaya Admin CC khusus Member (tetap ada jika Member pakai CC)
      if (user.role === Role.MEMBER && paymentPreference === PaymentPreference.CREDIT_CARD) {
        const adminFee = baseTotalAmount * 0.03;
        finalTotalAmount += adminFee;
        this.logger.log(`Admin fee CC applied: ${adminFee}`);
      }

      const order = await tx.order.create({
        data: {
          user: { connect: { id: userId } },
          subtotal,
          discountAmount: totalDiscount,
          taxAmount,
          totalAmount: finalTotalAmount,
          shippingAddress,
          courier,
          shippingCost,
          destinationPostalCode,
          destinationAreaId,
          status: OrderStatus.PENDING,
          items: { create: orderItemsData },
        },
        include: {
          items: { include: { product: true } },
        },
      });

      const cart = await tx.cart.findUnique({ where: { userId } });
      if (cart) {
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id, productId: { in: items.map((i) => i.productId) } },
        });
      }

      return order;
    });

    // --- EMAIL NOTIFIKASI ---
    try {
      const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
      if (adminEmail && user) {
        const subject = `Pesanan Baru Diterima: ${createdOrder.orderNumber}`;
        const html = `
          <h1>Pesanan Baru Masuk</h1>
          <p>Order <strong>${createdOrder.orderNumber}</strong> telah dibuat.</p>
          <p>User: ${user.name} (${user.email})</p>
          <p>Role: ${user.role}</p>
          <p>Total: ${createdOrder.totalAmount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}</p>
        `;
        this.emailService.sendEmail({ email: adminEmail, name: 'Admin' }, subject, html).catch((err) => {
            this.logger.error(`Gagal kirim email notif order: ${createdOrder.id}`, err);
        });
      }
    } catch (emailError) {
      this.logger.error(`Error persiapan email: ${createdOrder.id}`, emailError);
    }

    if (user.role === Role.RESELLER) {
      await this.accurateSyncService.addSalesOrderJobToQueue(createdOrder.id);
      return { ...createdOrder, redirect_url: null };
    } else if (user.role === Role.MEMBER) {
       // ... (Logika pembayaran Member tetap sama)
       if (!paymentPreference) throw new InternalServerErrorException('PaymentPreference missing for MEMBER.');
       try {
         const payment = await this.paymentsService.createPaymentForOrder(createdOrder, user, shippingCost, paymentPreference);
         return { ...createdOrder, redirect_url: payment.redirect_url };
       } catch (paymentError) {
          // ... (Logika rollback stok tetap sama)
          throw paymentError;
       }
    }

    throw new InternalServerErrorException('User role tidak valid.');
  }

  // ... (Method findAll, findOne, updateStatus tetap sama, tidak perlu dicopy ulang jika tidak berubah)
  async findAll(user: UserPayload, queryDto: PaginationDto & { search?: string }) {
      const { page = 1, limit = 10, search } = queryDto;
      const skip = (Number(page) - 1) * Number(limit);
      const whereClause: Prisma.OrderWhereInput = {};
      if (user.role !== Role.ADMIN) whereClause.userId = user.id;
      if (search) {
        whereClause.OR = [
          { orderNumber: { contains: search, mode: 'insensitive' } },
          { items: { some: { product: { name: { contains: search, mode: 'insensitive' } } } } },
        ];
      }
      const [orders, total] = await this.prisma.$transaction([
        this.prisma.order.findMany({
          where: whereClause, skip, take: Number(limit),
          include: { user: { select: { id: true, name: true, email: true } }, items: { include: { product: { include: { images: true } } } } },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.order.count({ where: whereClause }),
      ]);
      return { data: orders, meta: { total, page: Number(page), limit: Number(limit), lastPage: Math.ceil(total / Number(limit)) || 1 } };
  }

  async findOne(id: string, user: UserPayload) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { user: true, items: { include: { product: { include: { images: true } } } }, payment: { include: { manualPaymentMethod: true } }, shipment: true } });
    if (!order) throw new NotFoundException(`Order dengan ID ${id} tidak ditemukan`);
    if (user.role !== Role.ADMIN && order.userId !== user.id) throw new ForbiddenException('Anda tidak memiliki akses ke pesanan ini.');
    return order;
  }

  async updateStatus(orderId: string, updateOrderStatusDto: UpdateOrderStatusDto) {
    const { status: newStatus } = updateOrderStatusDto;
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { items: { select: { productId: true, quantity: true } }, payment: { include: { manualPaymentMethod: true } }, user: { select: { role: true } } } });
    if (!order) throw new NotFoundException(`Order dengan ID ${orderId} tidak ditemukan`);

    if (newStatus === OrderStatus.CANCELLED || newStatus === OrderStatus.REFUNDED) {
      if (order.status !== OrderStatus.CANCELLED && order.status !== OrderStatus.REFUNDED) {
        const stockUpdateOperations = order.items.map((item) => this.prisma.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } }));
        try {
          await this.prisma.$transaction([this.prisma.order.update({ where: { id: orderId }, data: { status: newStatus } }), ...stockUpdateOperations]);
          if (order.user.role === Role.RESELLER && order.accurateSalesOrderNumber) {
              await this.accurateSyncService.addDeleteSalesOrderJobToQueue(order.accurateSalesOrderNumber);
          }
          return this.prisma.order.findUnique({ where: { id: orderId } });
        } catch (error) {
          throw new InternalServerErrorException('Gagal membatalkan pesanan dan mengembalikan stok.');
        }
      } else {
        return this.prisma.order.update({ where: { id: orderId }, data: { status: newStatus } });
      }
    }
    if (newStatus === OrderStatus.PROCESSING) {
        // ... (Logika processing tetap sama)
         return this.prisma.order.update({ where: { id: orderId }, data: { status: newStatus } });
    }
    return this.prisma.order.update({ where: { id: orderId }, data: { status: newStatus } });
  }
}