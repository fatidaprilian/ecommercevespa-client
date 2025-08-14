// file: vespa-ecommerce-api/src/orders/orders.service.ts

import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createOrderDto: CreateOrderDto) {
    const { items, shippingAddress } = createOrderDto;

    // Menjalankan semua operasi database dalam satu transaksi
    const newOrder = await this.prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const orderItemsData: Prisma.OrderItemCreateManyOrderInput[] = [];

      // 1. Validasi produk, stok, dan hitung total
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundException(`Produk dengan ID ${item.productId} tidak ditemukan.`);
        }
        if (product.stock < item.quantity) {
          throw new UnprocessableEntityException(`Stok untuk produk ${product.name} tidak mencukupi.`);
        }

        totalAmount += product.price * item.quantity;
        orderItemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          price: product.price,
        });
      }

      // 2. Buat entitas Order utama
      const createdOrder = await tx.order.create({
        data: {
          user: { connect: { id: userId } },
          totalAmount,
          shippingAddress,
          status: 'PENDING',
          items: {
            create: orderItemsData,
          },
        },
        include: { items: true },
      });

      // 3. Kurangi stok untuk setiap produk
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // --- 4. PERUBAHAN UTAMA: KOSONGKAN KERANJANG ---
      const cart = await tx.cart.findUnique({ where: { userId } });
      if (cart) {
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      }
      // ----------------------------------------------

      return createdOrder;
    });

    return newOrder;
  }

  // ... (Method findAll dan findOne tetap sama, tidak perlu diubah)
  async findAll() {
    return this.prisma.order.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
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
}