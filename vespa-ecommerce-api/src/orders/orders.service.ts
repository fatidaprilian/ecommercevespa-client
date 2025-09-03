// file: vespa-ecommerce-api/src/orders/orders.service.ts

import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  ForbiddenException,
  Logger,
  InternalServerErrorException, // <-- Tambahkan ini
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
import { UpdateOrderStatusDto } from './dto/update-order-status.dto'; // <-- Tambahkan ini

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
    } = createOrderDto;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Pengguna tidak ditemukan.');

    const createdOrder = await this.prisma.$transaction(async (tx) => {
      let subtotal = 0;
      let totalDiscount = 0;
      const orderItemsData: Prisma.OrderItemCreateManyOrderInput[] = [];

      const vatPercentage = await this.settingsService.getVatPercentage();

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });
        if (!product)
          throw new NotFoundException(`Produk ID ${item.productId} tidak ditemukan.`);
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

        let finalPrice = originalPrice;
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
          price: finalPrice,
        });
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
        const productIdsInOrder = items.map((i) => i.productId);
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id, productId: { in: productIdsInOrder } },
        });
      }

      return order;
    });

    if (user.role === Role.RESELLER) {
      await this.accurateSyncService.addSalesOrderJobToQueue(createdOrder.id);
      return { ...createdOrder, redirect_url: null };
    } else {
      const payment = await this.paymentsService.createPaymentForOrder(
        createdOrder,
        user,
        shippingCost,
      );
      return { ...createdOrder, redirect_url: payment.redirect_url };
    }
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
        payment: {
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
          return this.prisma.order.findUnique({ where: { id: orderId } });
        
        } catch (error) {
          this.logger.error(`Gagal transaksi pengembalian stok untuk order ${orderId}`, error);
          throw new InternalServerErrorException('Gagal membatalkan pesanan dan mengembalikan stok.');
        }
      } else {
        return order;
      }
    }
    
    if (newStatus === OrderStatus.PROCESSING) {
      if (order.status !== OrderStatus.PAID && order.status !== OrderStatus.PENDING) {
        throw new ForbiddenException(`Pesanan dengan status ${order.status} tidak dapat diubah menjadi PROCESSING.`);
      }

      await this.prisma.$transaction(async (tx) => {
        if (order.payment) {
          await tx.payment.update({
            where: { id: order.payment.id },
            data: { status: PaymentStatus.SUCCESS },
          });
        }
        await tx.order.update({
          where: { id: orderId },
          data: { status: newStatus },
        });
      });

      // Trigger Accurate Sync jika ini pembayaran manual
      if (order.payment?.method === 'MANUAL_TRANSFER') {
        const manualMethod = order.payment.manualPaymentMethod;
        if (!manualMethod || !manualMethod.accurateBankNo) {
          this.logger.error(`Detail bank Accurate tidak ditemukan untuk order ${orderId}. Sinkronisasi Accurate dibatalkan.`);
        } else {
          this.accurateSyncService.createSalesInvoiceAndReceipt(orderId, manualMethod.accurateBankNo, manualMethod.accurateBankName)
            .catch(err => {
              this.logger.error(`Gagal trigger sinkronisasi Accurate untuk order ${orderId}`, err.stack);
            });
        }
      }

      return this.prisma.order.findUnique({ where: { id: orderId } });
    }
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: newStatus },
    });
  }
}