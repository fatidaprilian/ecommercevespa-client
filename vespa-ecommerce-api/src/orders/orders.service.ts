// src/orders/orders.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createOrderDto: CreateOrderDto) {
    const { items } = createOrderDto;

    // 1. Ambil semua data produk dari DB berdasarkan ID yang diberikan
    const productIds = items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    // Validasi jika ada produk yang tidak ditemukan
    if (products.length !== productIds.length) {
      throw new NotFoundException('Satu atau lebih produk tidak ditemukan');
    }

    // 2. Hitung total harga di backend (PENTING!)
    let totalAmount = new Prisma.Decimal(0);
    const orderItemsData = items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        // Seharusnya tidak terjadi karena validasi di atas, tapi ini untuk keamanan
        throw new NotFoundException(`Produk dengan ID ${item.productId} tidak ditemukan`);
      }
      
      const itemTotal = product.price.mul(item.quantity);
      totalAmount = totalAmount.add(itemTotal);

      return {
        productId: item.productId,
        quantity: item.quantity,
        price: product.price, // Simpan harga saat ini ke dalam order item
      };
    });

    // 3. Gunakan Prisma Transaction untuk membuat Order dan OrderItems
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId,
          totalAmount,
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: true, // Sertakan item dalam response
        },
      });

      return order;
    });
  }
}