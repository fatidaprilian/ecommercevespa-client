// file: vespa-ecommerce-api/src/cart/cart.service.ts

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnprocessableEntityException, // <-- 1. IMPORT EXCEPTION YANG LEBIH SPESIFIK
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  /**
   * Helper pribadi untuk mendapatkan atau membuat keranjang untuk user.
   * Ini mencegah duplikasi kode di fungsi-fungsi lain.
   */
  private async findOrCreateCart(userId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
    });
    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
      });
    }
    return cart;
  }

  /**
   * Mengambil isi keranjang belanja user beserta detail produk.
   * Jika user belum punya keranjang, akan dibuatkan yang baru dan kosong.
   */
  async getCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true, // Sertakan gambar produk
              },
            },
          },
          orderBy: {
            product: {
              name: 'asc', // Urutkan item berdasarkan nama produk A-Z
            },
          },
        },
      },
    });

    // Jika user belum punya cart, buatkan yang kosong dan kembalikan
    if (!cart) {
      return this.prisma.cart.create({
        data: { userId },
        include: { items: true },
      });
    }
    return cart;
  }

  /**
   * Menambah item baru ke keranjang atau menambah kuantitas jika item sudah ada.
   */
  async addItem(userId: string, addItemDto: AddItemDto) {
    const { productId, quantity } = addItemDto;
    const cart = await this.findOrCreateCart(userId);

    // Validasi produk dan stok sebelum menambahkan
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Produk dengan ID ${productId} tidak ditemukan.`);
    }

    // --- PERUBAHAN DI SINI ---
    // 2. GUNAKAN UnprocessableEntityException SAAT STOK TIDAK CUKUP
    if (product.stock < quantity) {
      throw new UnprocessableEntityException(`Stok untuk produk ${product.name} tidak mencukupi.`);
    }

    const existingItem = await this.prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId },
    });

    if (existingItem) {
      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: { increment: quantity } },
      });
    } else {
      await this.prisma.cartItem.create({
        data: { cartId: cart.id, productId, quantity },
      });
    }
    // Kembalikan state keranjang terbaru setelah modifikasi
    return this.getCart(userId);
  }

  /**
   * Mengubah kuantitas item yang sudah ada di keranjang.
   * Kuantitas tidak boleh kurang dari 1.
   */
  async updateItemQuantity(
    userId: string,
    cartItemId: string,
    updateItemDto: UpdateItemDto,
  ) {
    const { quantity } = updateItemDto;
    // Sesuai permintaan: tolak jika kuantitas kurang dari 1
    if (quantity < 1) {
      throw new ForbiddenException(
        'Kuantitas tidak boleh kurang dari 1. Gunakan endpoint hapus untuk menghilangkan item.',
      );
    }

    const item = await this.prisma.cartItem.findFirst({
      where: { id: cartItemId, cart: { userId } },
    });

    if (!item) {
      throw new ForbiddenException(
        'Akses ditolak. Item keranjang tidak ditemukan atau bukan milik Anda.',
      );
    }

    await this.prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity },
    });

    return this.getCart(userId);
  }

  /**
   * Menghapus satu item dari keranjang dengan aman.
   */
  async removeItem(userId: string, cartItemId: string) {
    // Pastikan item yang akan dihapus benar-benar ada dan milik user
    const item = await this.prisma.cartItem.findFirst({
      where: { id: cartItemId, cart: { userId } },
    });

    // Jika item tidak ditemukan (mungkin sudah dihapus di tab lain),
    // jangan lempar error. Cukup kembalikan state keranjang saat ini.
    // Ini mencegah error 400/500 di frontend.
    if (!item) {
      console.warn(
        `Upaya menghapus item keranjang yang tidak ada: ${cartItemId} untuk user: ${userId}`,
      );
      return this.getCart(userId);
    }

    // Jika item ada, hapus.
    await this.prisma.cartItem.delete({
      where: { id: item.id },
    });

    return this.getCart(userId);
  }
}