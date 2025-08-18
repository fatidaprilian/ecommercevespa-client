// file: vespa-ecommerce-api/src/orders/orders.service.ts

import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Prisma, Role, OrderStatus, PaymentStatus } from '@prisma/client';
import { PaymentsService } from 'src/payments/payments.service';
import { DiscountsCalculationService } from 'src/discounts/discounts-calculation.service';
import { UserPayload } from 'src/auth/interfaces/jwt.payload';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
    private discountsCalcService: DiscountsCalculationService,
  ) {}

  async create(userId: string, createOrderDto: CreateOrderDto) {
    // Ambil semua data dari DTO, termasuk yang baru
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
          destinationAreaId, // Simpan areaId di sini
          status: OrderStatus.PENDING,
          items: { create: orderItemsData },
        },
      });
      
      for (const item of items) {
        await tx.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } });
      }
      const cart = await tx.cart.findUnique({ where: { userId } });
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
        items: { include: { product: { include: { images: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  
  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        items: { include: { product: true } },
        payment: true,
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
    if (newStatus !== OrderStatus.PROCESSING) {
        throw new UnprocessableEntityException('Perubahan status manual hanya diizinkan menjadi "PROCESSING".');
    }
    if (order.payment) {
        await this.prisma.payment.update({
            where: { id: order.payment.id },
            data: { status: PaymentStatus.SUCCESS }
        });
    }
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: newStatus },
    });
  }
}