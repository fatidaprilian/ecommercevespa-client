// file: vespa-ecommerce-api/src/cart/cart.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  // Helper untuk mendapatkan atau membuat cart untuk user
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
  
  // Mengambil isi keranjang user
  async getCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: { // Sertakan detail produk di setiap item
              include: {
                images: true, // Ambil juga gambar produk
              }
            }
          },
          orderBy: {
            product: {
              name: 'asc'
            }
          }
        },
      },
    });

    if (!cart) {
      // Jika user belum punya cart, buatkan yang kosong
      return this.prisma.cart.create({
        data: { userId },
        include: { items: true }
      });
    }
    return cart;
  }

  // Menambah item ke keranjang
  async addItem(userId: string, addItemDto: AddItemDto) {
    const { productId, quantity } = addItemDto;
    const cart = await this.findOrCreateCart(userId);

    const existingItem = await this.prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId },
    });

    if (existingItem) {
      // Jika item sudah ada, update kuantitasnya
      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: { increment: quantity } },
      });
    } else {
      // Jika item baru, buat entri baru
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
        },
      });
    }
    return this.getCart(userId);
  }

  // Mengubah kuantitas item
  async updateItemQuantity(userId: string, cartItemId: string, updateItemDto: UpdateItemDto) {
    // Pastikan item yang diupdate milik user yang benar
    const item = await this.prisma.cartItem.findFirstOrThrow({
        where: { id: cartItemId, cart: { userId } }
    });

    await this.prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity: updateItemDto.quantity },
    });
    return this.getCart(userId);
  }

  // Menghapus item dari keranjang
  async removeItem(userId: string, cartItemId: string) {
    // Pastikan item yang dihapus milik user yang benar
    const item = await this.prisma.cartItem.findFirstOrThrow({
        where: { id: cartItemId, cart: { userId } }
    });
    
    await this.prisma.cartItem.delete({
      where: { id: item.id },
    });
    return this.getCart(userId);
  }
}