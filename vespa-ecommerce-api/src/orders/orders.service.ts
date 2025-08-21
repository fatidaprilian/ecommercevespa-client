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

    return this.prisma.$transaction(async (tx) => {
      let subtotal = 0;
      let totalDiscount = 0;
      const orderItemsData: Prisma.OrderItemCreateManyOrderInput[] = [];
      const productDetailsForPayment: any[] = [];
      
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
        productDetailsForPayment.push({ product, quantity: item.quantity, price: finalPrice, productId: product.id });
      }

      const taxableAmount = subtotal - totalDiscount;
      const taxAmount = (taxableAmount * vatPercentage) / 100;
      const totalAmount = taxableAmount + taxAmount + shippingCost;
      
      const createdOrder = await tx.order.create({
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
            amount: totalAmount,
            method: 'MANUAL_TRANSFER',
            status: PaymentStatus.PENDING,
          }
        });
        return { ...createdOrder, redirect_url: null };
      } else {
        const orderWithItems = { ...createdOrder, items: productDetailsForPayment, subtotal, taxAmount };
        const payment = await this.paymentsService.createPaymentForOrder(orderWithItems, user, shippingCost, tx);
        return { ...createdOrder, redirect_url: payment.redirect_url };
      }
    });
  }

  /**
   * Retrieves all orders, filtered by user role.
   */
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
  
  /**
   * Retrieves a single order by its ID, including related payment and shipment data.
   */
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
            // Include the related bank details for verification purposes
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
  
  /**
   * Updates an order's status. This is the key method that triggers Accurate sync for resellers.
   */
  async updateStatus(orderId: string, newStatus: OrderStatus) {
    // We use findOne to get all necessary relations, including payment details.
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

      // Trigger Accurate sync specifically for manual transfer payments.
      if (order.payment?.method === 'MANUAL_TRANSFER') {
        // Retrieve the bank details directly from the related order data.
        const manualMethod = order.payment.manualPaymentMethod;
        
        if (!manualMethod || !manualMethod.accurateBankNo) {
          this.logger.error(`Accurate bank details not found for order ${orderId}. Accurate sync cancelled.`);
        } else {
          // Call the sync service with the retrieved bank details.
          this.accurateSyncService.createSalesInvoiceAndReceipt(orderId, manualMethod.accurateBankNo, manualMethod.accurateBankName)
            .catch(err => {
              this.logger.error(`Failed to trigger Accurate sync for order ${orderId}`, err.stack);
            });
        }
      }
      
      return this.findOne(orderId);
    } else {
      // For other status changes (e.g., to CANCELLED), just update the order status.
      return this.prisma.order.update({
        where: { id: orderId },
        data: { status: newStatus },
      });
    }
  }
}