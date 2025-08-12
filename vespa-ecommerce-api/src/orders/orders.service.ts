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

  /**
   * Membuat order baru untuk user tertentu.
   * Method ini akan berjalan dalam satu transaksi database untuk memastikan integritas data.
   * @param userId - ID dari user yang membuat order.
   * @param createOrderDto - Data untuk membuat order baru, termasuk item dan alamat pengiriman.
   * @returns Order yang baru dibuat beserta itemnya.
   */
  async create(userId: string, createOrderDto: CreateOrderDto) {
    const { items, shippingAddress } = createOrderDto;

    // Menjalankan semua operasi database dalam satu transaksi
    const newOrder = await this.prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      // Memberikan tipe eksplisit pada array untuk item order
      const orderItemsData: Prisma.OrderItemCreateManyOrderInput[] = [];

      // 1. Iterasi setiap item, validasi produk, dan hitung total harga
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundException(
            `Produk dengan ID ${item.productId} tidak ditemukan.`,
          );
        }
        if (product.stock < item.quantity) {
          throw new UnprocessableEntityException(
            `Stok untuk produk ${product.name} tidak mencukupi. Tersedia: ${product.stock}, Diminta: ${item.quantity}`,
          );
        }

        // Akumulasi total harga
        totalAmount += product.price * item.quantity;

        orderItemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          price: product.price, // Simpan harga produk saat itu juga
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
        include: {
          items: true, // Sertakan item yang baru dibuat dalam response
        },
      });

      // 3. Kurangi stok untuk setiap produk yang diorder
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      return createdOrder;
    });

    return newOrder;
  }

  /**
   * Mengambil semua order yang ada di sistem.
   * @returns Daftar semua order.
   */
  async findAll() {
    return this.prisma.order.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Mengambil satu order spesifik berdasarkan ID.
   * @param id - ID dari order yang ingin dicari.
   * @returns Detail lengkap dari satu order.
   */
  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        items: {
          include: {
            product: true,
          },
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
}