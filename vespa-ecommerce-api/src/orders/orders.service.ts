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

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
    private discountsCalcService: DiscountsCalculationService,
    private accurateSyncService: AccurateSyncService,
  ) {}

  async create(userId: string, createOrderDto: CreateOrderDto) {
    const { items, shippingAddress, shippingCost, courier, destinationPostalCode, destinationAreaId } = createOrderDto;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Pengguna tidak ditemukan.');

    return this.prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const orderItemsData: Prisma.OrderItemCreateManyOrderInput[] = [];
      const productDetailsForPayment: any[] = [];

      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new NotFoundException(`Produk ID ${item.productId} tidak ditemukan.`);
        if (product.stock < item.quantity) throw new UnprocessableEntityException(`Stok untuk ${product.name} tidak mencukupi.`);
        
        let finalPrice = product.price;
        if (user.role === Role.RESELLER) {
          const priceInfo = await this.discountsCalcService.calculatePrice(user, product);
          finalPrice = priceInfo.finalPrice;
        }

        totalAmount += finalPrice * item.quantity;
        orderItemsData.push({ productId: item.productId, quantity: item.quantity, price: finalPrice });
        productDetailsForPayment.push({ product, quantity: item.quantity, price: finalPrice, productId: product.id });
      }

      const createdOrder = await tx.order.create({
        data: {
          user: { connect: { id: userId } },
          totalAmount, 
          shippingAddress, 
          courier, 
          shippingCost,
          destinationPostalCode,
          destinationAreaId,
          status: OrderStatus.PENDING,
          items: { create: orderItemsData },
        },
      });
      
      const cart = await this.prisma.cart.findUnique({ where: { userId } });
      if (cart) {
        const productIdsInOrder = items.map(i => i.productId);
        await tx.cartItem.deleteMany({ where: { cartId: cart.id, productId: { in: productIdsInOrder } } });
      }

      if (user.role === Role.RESELLER) {
        await tx.payment.create({
          data: {
            orderId: createdOrder.id,
            amount: totalAmount + shippingCost,
            method: 'MANUAL_TRANSFER',
            status: PaymentStatus.PENDING,
          }
        });
        return { ...createdOrder, redirect_url: null };
      } else {
        const orderWithItems = { ...createdOrder, items: productDetailsForPayment };
        const payment = await this.paymentsService.createPaymentForOrder(orderWithItems, user, shippingCost, tx);
        return { ...createdOrder, redirect_url: payment.redirect_url };
      }
    });
  }

  async findAll(user: UserPayload) {
    const whereClause: Prisma.OrderWhereInput = {};
    if (user.role !== Role.ADMIN) {
      whereClause.userId = user.id;
    }
    return this.prisma.order.findMany({
      where: whereClause,
      include: {
        ...(user.role === Role.ADMIN && {
            user: { select: { id: true, name: true, email: true } }
        }),
        items: { 
          include: { 
            product: { 
              include: { images: true } 
            } 
          } 
        },
      },
      orderBy: { createdAt: 'desc' },
    });
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
        payment: true,
        shipment: true,
      },
    });
    if (!order) {
      throw new NotFoundException(`Order dengan ID ${id} tidak ditemukan`);
    }
    return order;
  }
  
  async updateStatus(orderId: string, newStatus: OrderStatus, manualPaymentMethodId?: string) {
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
        if (!manualPaymentMethodId) {
          throw new BadRequestException('Silakan pilih rekening bank tujuan untuk melanjutkan sinkronisasi.');
        }

        const manualMethod = await this.prisma.manualPaymentMethod.findUnique({
          where: { id: manualPaymentMethodId },
        });

        if (!manualMethod) {
          this.logger.error(`Metode Pembayaran Manual dengan ID ${manualPaymentMethodId} tidak ditemukan untuk pesanan ${orderId}.`);
        } else {
          // ✅ PERBAIKAN: Kirim 2 argumen yang benar (orderId, bankName)
          this.accurateSyncService.createSalesInvoiceAndReceipt(orderId, manualMethod.accurateBankName)
            .catch(err => {
              this.logger.error(`Gagal memicu sinkronisasi Accurate dari update manual untuk pesanan ${orderId}`, err.stack);
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