// file: vespa-ecommerce-api/src/orders/orders.service.ts

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
// Import enum PaymentPreference dari DTO
import { CreateOrderDto, PaymentPreference } from './dto/create-order.dto';
import { Prisma, Role, OrderStatus, PaymentStatus } from '@prisma/client';
import { PaymentsService } from 'src/payments/payments.service';
import { DiscountsCalculationService } from 'src/discounts/discounts-calculation.service';
import { UserPayload } from 'src/auth/interfaces/jwt.payload';
import { AccurateSyncService } from 'src/accurate-sync/accurate-sync.service';
import { SettingsService } from 'src/settings/settings.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
    private discountsCalcService: DiscountsCalculationService,
    private accurateSyncService: AccurateSyncService,
    private settingsService: SettingsService,
  ) {}

  /**
   * Creates a new order.
   * This method is responsible for accurately calculating all cost components
   * and differentiating the flow for MEMBER vs. RESELLER.
   */
  async create(userId: string, createOrderDto: CreateOrderDto) {
    const {
      items,
      shippingAddress,
      shippingCost,
      courier,
      destinationPostalCode,
      destinationAreaId,
      paymentPreference, // <-- Ambil paymentPreference dari DTO
    } = createOrderDto;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Pengguna tidak ditemukan.');

    // --- Validasi khusus MEMBER ---
    if (user.role === Role.MEMBER && !paymentPreference) {
      throw new BadRequestException(
        'Preferensi pembayaran (paymentPreference) harus disertakan untuk Member.',
      );
    }
    // ----------------------------

    const createdOrder = await this.prisma.$transaction(async (tx) => {
      let subtotal = 0;
      let totalDiscount = 0; // Hanya relevan untuk Reseller
      const orderItemsData: Prisma.OrderItemCreateManyOrderInput[] = [];

      const vatPercentage = await this.settingsService.getVatPercentage();

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });
        if (!product)
          throw new NotFoundException(
            `Produk ID ${item.productId} tidak ditemukan.`,
          );
        if (product.stock < item.quantity)
          throw new UnprocessableEntityException(
            `Stok untuk ${product.name} tidak mencukupi.`,
          );

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });

        const originalPrice = product.price;
        subtotal += originalPrice * item.quantity;

        // Diskon hanya berlaku untuk Reseller
        let finalPrice = originalPrice; // Untuk MEMBER, finalPrice = originalPrice
        if (user.role === Role.RESELLER) {
          const priceInfo = await this.discountsCalcService.calculatePrice(
            user,
            product,
          );
          finalPrice = priceInfo.finalPrice;
          totalDiscount += (originalPrice - finalPrice) * item.quantity;
        }

        orderItemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          // Harga item di order tetap harga asli jika MEMBER, atau harga diskon jika RESELLER
          price: finalPrice,
        });
      }

      // Hitung total dasar (SEBELUM biaya admin CC jika ada)
      const taxableAmount = subtotal - totalDiscount; // totalDiscount akan 0 untuk MEMBER
      const taxAmount = (taxableAmount * vatPercentage) / 100;
      const baseTotalAmount = taxableAmount + taxAmount + shippingCost;

      // --- Logika Penambahan Biaya Admin KHUSUS MEMBER dan CC ---
      let finalTotalAmount = baseTotalAmount;
      let adminFee = 0;
      if (
        user.role === Role.MEMBER &&
        paymentPreference === PaymentPreference.CREDIT_CARD
      ) {
        adminFee = baseTotalAmount * 0.03; // Hitung 3% dari total dasar
        finalTotalAmount = baseTotalAmount + adminFee; // Total akhir termasuk fee
        this.logger.log(`Admin fee CC ${adminFee} applied for order. Final total: ${finalTotalAmount}`);
      }
      // ---------------------------------------------------------

      const order = await tx.order.create({
        data: {
          user: { connect: { id: userId } },
          subtotal,
          discountAmount: totalDiscount, // Tetap 0 untuk MEMBER
          taxAmount,
          // --- SIMPAN TOTAL AKHIR (TERMASUK FEE JIKA ADA) ---
          totalAmount: finalTotalAmount,
          // ----------------------------------------------------
          shippingAddress,
          courier,
          shippingCost,
          destinationPostalCode,
          destinationAreaId,
          status: OrderStatus.PENDING,
          items: { create: orderItemsData },
          // Anda bisa tambahkan field baru di model Order jika ingin menyimpan adminFee
          // adminFee: adminFee > 0 ? adminFee : null,
        },
        include: {
          items: {
            include: {
              product: true, // Sertakan produk untuk diteruskan ke service payment
            },
          },
        },
      });

      // Hapus item dari keranjang setelah order dibuat (logika ini tetap)
      const cart = await tx.cart.findUnique({ where: { userId } });
      if (cart) {
        const productIdsInOrder = items.map((i) => i.productId);
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id, productId: { in: productIdsInOrder } },
        });
      }

      return order;
    });

    // --- Logika Setelah Transaksi ---

    // RESELLER: Alur tetap sama, langsung kirim job ke Accurate
    if (user.role === Role.RESELLER) {
      await this.accurateSyncService.addSalesOrderJobToQueue(createdOrder.id);
      // Reseller tidak butuh redirect_url Midtrans
      return { ...createdOrder, redirect_url: null };
    }

    // MEMBER: Lanjutkan ke pembuatan pembayaran Midtrans
    else if (user.role === Role.MEMBER) {
      // Pastikan paymentPreference ada (seharusnya sudah divalidasi di awal)
      if (!paymentPreference) {
         throw new InternalServerErrorException("PaymentPreference missing for MEMBER role.");
      }
      try {
        const payment = await this.paymentsService.createPaymentForOrder(
          createdOrder, // createdOrder sudah berisi totalAmount yang benar (termasuk fee jika CC)
          user,
          shippingCost,
          paymentPreference, // <-- Teruskan preferensi ke service payment
        );
        return { ...createdOrder, redirect_url: payment.redirect_url };
      } catch (paymentError) {
          // --- Rollback Stok jika Gagal Membuat Pembayaran ---
          this.logger.error(`Gagal membuat pembayaran Midtrans untuk order ${createdOrder.id}. Melakukan rollback stok...`, paymentError);
          const stockRestoreOperations = createdOrder.items.map(item =>
            this.prisma.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } }
            })
          );
          // Update status order menjadi CANCELLED
          const cancelOrderOperation = this.prisma.order.update({
              where: { id: createdOrder.id },
              data: { status: OrderStatus.CANCELLED }
          });
          try {
             await this.prisma.$transaction([...stockRestoreOperations, cancelOrderOperation]);
             this.logger.log(`Rollback stok berhasil untuk order ${createdOrder.id}.`);
          } catch (rollbackError) {
             this.logger.error(`FATAL: Gagal rollback stok untuk order ${createdOrder.id}. Perlu pengecekan manual!`, rollbackError);
          }
          // Lemparkan error asli agar frontend tahu gagal
          throw paymentError;
          // ----------------------------------------------------
      }
    }

    // Default (seharusnya tidak terjadi jika role hanya MEMBER/RESELLER/ADMIN)
    throw new InternalServerErrorException('User role tidak valid untuk membuat order.');
  }

  async findAll(user: UserPayload, queryDto: PaginationDto & { search?: string }) {
    const { page = 1, limit = 10, search } = queryDto;
    const skip = (Number(page) - 1) * Number(limit);

    const whereClause: Prisma.OrderWhereInput = {};

    if (user.role !== Role.ADMIN) {
      whereClause.userId = user.id;
    }

    if (search) {
      const searchConditions: Prisma.OrderWhereInput[] = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        {
          items: {
            some: { product: { name: { contains: search, mode: 'insensitive' } } },
          },
        },
      ];
      if (user.role === Role.ADMIN) {
        searchConditions.push({
          user: { name: { contains: search, mode: 'insensitive' } },
        });
        searchConditions.push({
          user: { email: { contains: search, mode: 'insensitive' } },
        });
      }
      whereClause.OR = searchConditions;
    }

    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where: whereClause,
        skip,
        take: Number(limit),
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: {
            include: {
              product: {
                include: { images: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where: whereClause }),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        lastPage: Math.ceil(total / Number(limit)) || 1,
      },
    };
  }

  async findOne(id: string, user: UserPayload) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        items: {
          include: {
            product: {
              include: { images: true },
            },
          },
        },
        payment: {
          include: {
            manualPaymentMethod: true,
          },
        },
        shipment: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order dengan ID ${id} tidak ditemukan`);
    }

    if (user.role !== Role.ADMIN && order.userId !== user.id) {
      throw new ForbiddenException('Anda tidak memiliki akses ke pesanan ini.');
    }

    return order;
  }
  async updateStatus(
    orderId: string,
    updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    const { status: newStatus } = updateOrderStatusDto;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          select: { productId: true, quantity: true },
        },
        payment: { // Pastikan payment di-include
          include: {
            manualPaymentMethod: true
          }
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order dengan ID ${orderId} tidak ditemukan`);
    }

    // 1. Logika Pengembalian Stok (Restock Logic)
    if (newStatus === OrderStatus.CANCELLED || newStatus === OrderStatus.REFUNDED) {
      // Hanya kembalikan stok jika statusnya berubah dan sebelumnya BUKAN cancelled/refunded
      if (order.status !== OrderStatus.CANCELLED && order.status !== OrderStatus.REFUNDED) {

        const stockUpdateOperations = order.items.map((item) =>
          this.prisma.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          }),
        );

        const orderStatusUpdateOperation = this.prisma.order.update({
          where: { id: orderId },
          data: { status: newStatus },
        });

        try {
          await this.prisma.$transaction([
            orderStatusUpdateOperation,
            ...stockUpdateOperations,
          ]);

          this.logger.log(`Stok untuk pesanan ${orderId} telah dikembalikan karena status diubah menjadi ${newStatus}.`);
          // Ambil data terbaru setelah transaksi
          return this.prisma.order.findUnique({ where: { id: orderId } });

        } catch (error) {
          this.logger.error(`Gagal transaksi pengembalian stok untuk order ${orderId}`, error);
          throw new InternalServerErrorException('Gagal membatalkan pesanan dan mengembalikan stok.');
        }
      } else {
         // Jika status sudah CANCELLED/REFUNDED sebelumnya, update status saja
        return this.prisma.order.update({
             where: { id: orderId },
             data: { status: newStatus },
        });
      }
    }

    // --- BLOK YANG DIPERBAIKI ---
    if (newStatus === OrderStatus.PROCESSING) {
      // Status PAID (dari Midtrans) atau PENDING (jika admin validasi manual) bisa jadi PROCESSING
      if (order.status !== OrderStatus.PAID && order.status !== OrderStatus.PENDING) {
        throw new ForbiddenException(`Pesanan dengan status ${order.status} tidak dapat diubah menjadi PROCESSING.`);
      }
      
      try {
        // Gunakan transaction callback function
        await this.prisma.$transaction(async (tx) => {
          // Update payment status HANYA jika ada payment dan statusnya berbeda
          if (order.payment && order.payment.status !== PaymentStatus.SUCCESS) {
            await tx.payment.update({
              where: { id: order.payment.id },
              data: { status: PaymentStatus.SUCCESS }, // Set SUCCESS saat PROCESSING
            });
          }
          // Update order status (diasumsikan selalu berubah jika masuk blok ini)
          await tx.order.update({
            where: { id: orderId },
            data: { status: newStatus },
          });
        });

        // Trigger Accurate Sync di LUAR transaksi
        if (order.payment?.method === 'MANUAL_TRANSFER') {
          const manualMethod = order.payment.manualPaymentMethod;
          if (!manualMethod || !manualMethod.accurateBankNo) {
            this.logger.error(`Detail bank Accurate tidak ditemukan untuk order ${orderId}. Sinkronisasi Accurate dibatalkan.`);
          } else {
            // Jalankan di background (tanpa await)
            this.accurateSyncService.createSalesInvoiceAndReceipt(orderId, manualMethod.accurateBankNo, manualMethod.accurateBankName)
              .catch(err => {
                this.logger.error(`Gagal trigger sinkronisasi Accurate untuk order ${orderId} (background process)`, err.stack);
              });
          }
        }

        // Ambil data order terbaru setelah update untuk dikembalikan
        return this.prisma.order.findUnique({ where: { id: orderId } });

      } catch (error) {
         this.logger.error(`Gagal transaksi saat update order ${orderId} ke PROCESSING`, error);
         throw new InternalServerErrorException('Gagal memproses status pesanan.');
      }
    }
    // --- AKHIR BLOK YANG DIPERBAIKI ---


    // Untuk transisi status lainnya (misal: PROCESSING -> SHIPPED, SHIPPED -> DELIVERED, dll.)
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: newStatus },
    });
  }
}