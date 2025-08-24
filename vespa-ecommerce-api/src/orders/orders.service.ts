// file: vespa-ecommerce-api/src/orders/orders.service.ts

import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  ForbiddenException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Prisma, Role, OrderStatus, PaymentStatus } from '@prisma/client';
import { PaymentsService } from 'src/payments/payments.service';
import { DiscountsCalculationService } from 'src/discounts/discounts-calculation.service';
import { UserPayload } from 'src/auth/interfaces/jwt.payload';
import { AccurateSyncService } from 'src/accurate-sync/accurate-sync.service';
import { SettingsService } from 'src/settings/settings.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';

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
    const { items, shippingAddress, shippingCost, courier, destinationPostalCode, destinationAreaId } = createOrderDto;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Pengguna tidak ditemukan.');

    // Langkah 1: Buat pesanan dalam satu transaksi database.
    const createdOrder = await this.prisma.$transaction(async (tx) => {
      let subtotal = 0;
      let totalDiscount = 0;
      const orderItemsData: Prisma.OrderItemCreateManyOrderInput[] = [];
      
      const vatPercentage = await this.settingsService.getVatPercentage();

      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new NotFoundException(`Produk ID ${item.productId} tidak ditemukan.`);
        if (product.stock < item.quantity) throw new UnprocessableEntityException(`Stok untuk ${product.name} tidak mencukupi.`);
        
        const originalPrice = product.price;
        subtotal += originalPrice * item.quantity;
        
        let finalPrice = originalPrice;
        if (user.role === Role.RESELLER) {
          const priceInfo = await this.discountsCalcService.calculatePrice(user, product);
          finalPrice = priceInfo.finalPrice;
          totalDiscount += (originalPrice - finalPrice) * item.quantity;
        }

        orderItemsData.push({ productId: item.productId, quantity: item.quantity, price: finalPrice });
      }

      const taxableAmount = subtotal - totalDiscount;
      const taxAmount = (taxableAmount * vatPercentage) / 100;
      const totalAmount = taxableAmount + taxAmount + shippingCost;
      
      const order = await tx.order.create({
        data: {
          user: { connect: { id: userId } },
          subtotal,
          discountAmount: totalDiscount,
          taxAmount,
          totalAmount,
          shippingAddress, 
          courier, 
          shippingCost,
          destinationPostalCode,
          destinationAreaId,
          status: OrderStatus.PENDING,
          items: { create: orderItemsData },
        },
        // Ambil data yang dibutuhkan untuk langkah selanjutnya
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });
      
      const cart = await tx.cart.findUnique({ where: { userId } });
      if (cart) {
        const productIdsInOrder = items.map(i => i.productId);
        await tx.cartItem.deleteMany({ where: { cartId: cart.id, productId: { in: productIdsInOrder } } });
      }
      
      return order;
    });

    // Langkah 2: Lakukan aksi SETELAH transaksi database selesai.
    if (user.role === Role.RESELLER) {
      // Untuk Reseller: Tambahkan job ke antrean untuk sinkronisasi Accurate.
      await this.accurateSyncService.addSalesOrderJobToQueue(createdOrder.id);
      return { ...createdOrder, redirect_url: null };
    } else {
      // Untuk Member: Proses pembayaran seperti biasa (alur tidak berubah).
      const payment = await this.paymentsService.createPaymentForOrder(createdOrder, user, shippingCost);
      return { ...createdOrder, redirect_url: payment.redirect_url };
    }
  }
  
  // (Fungsi findAll, findOne, dan updateStatus tidak ada perubahan)

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
        { items: { some: { product: { name: { contains: search, mode: 'insensitive' } } } } }
      ];
      if (user.role === Role.ADMIN) {
        searchConditions.push({ user: { name: { contains: search, mode: 'insensitive' } } });
        searchConditions.push({ user: { email: { contains: search, mode: 'insensitive' } } });
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
                      include: { images: true } 
                    } 
                  } 
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
  
  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        items: { 
          include: { 
            product: { 
              include: { images: true } 
            } 
          } 
        },
        payment: {
          include: {
            manualPaymentMethod: true,
          }
        },
        shipment: true,
      },
    });
    if (!order) {
      throw new NotFoundException(`Order dengan ID ${id} tidak ditemukan`);
    }
    return order;
  }
  
  async updateStatus(orderId: string, newStatus: OrderStatus) {
    const order = await this.findOne(orderId);
    
    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.PAID) {
      throw new ForbiddenException(`Pesanan dengan status ${order.status} tidak dapat diubah.`);
    }

    if (newStatus === OrderStatus.PROCESSING) {
      await this.prisma.$transaction(async (tx) => {
        if (order.payment) {
          await tx.payment.update({
            where: { id: order.payment.id },
            data: { status: PaymentStatus.SUCCESS }
          });
        }
        await tx.order.update({
          where: { id: orderId },
          data: { status: newStatus },
        });
      });

      if (order.payment?.method === 'MANUAL_TRANSFER') {
        const manualMethod = order.payment.manualPaymentMethod;
        
        if (!manualMethod || !manualMethod.accurateBankNo) {
          this.logger.error(`Accurate bank details not found for order ${orderId}. Accurate sync cancelled.`);
        } else {
          this.accurateSyncService.createSalesInvoiceAndReceipt(orderId, manualMethod.accurateBankNo, manualMethod.accurateBankName)
            .catch(err => {
              this.logger.error(`Failed to trigger Accurate sync for order ${orderId}`, err.stack);
            });
        }
      }
      
      return this.findOne(orderId);
    } else {
      return this.prisma.order.update({
        where: { id: orderId },
        data: { status: newStatus },
      });
    }
  }
}