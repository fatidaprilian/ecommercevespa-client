// file: vespa-ecommerce-api/src/cart/cart.service.ts

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { DiscountsCalculationService } from 'src/discounts/discounts-calculation.service'; // <-- 1. Import kalkulator
import { Role } from '@prisma/client';

@Injectable()
export class CartService {
  constructor(
    private prisma: PrismaService,
    private discountsCalcService: DiscountsCalculationService, // <-- 2. Suntikkan (Inject) service
  ) {}

  /**
   * Helper pribadi untuk mendapatkan atau membuat keranjang untuk user.
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
   * Mengambil isi keranjang belanja user, menghitung ulang harga jika reseller.
   */
  async getCart(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        throw new NotFoundException('User tidak ditemukan.');
    }

    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true,
              },
            },
          },
          orderBy: {
            product: {
              name: 'asc',
            },
          },
        },
      },
    });

    if (!cart) {
      return this.prisma.cart.create({
        data: { userId },
        include: { items: true },
      });
    }

    // --- 3. LOGIKA KALKULASI HARGA DITERAPKAN DI SINI ---
    if (user.role === Role.RESELLER) {
      const processedItems = await Promise.all(
        cart.items.map(async (item) => {
          const priceInfo = await this.discountsCalcService.calculatePrice(user, item.product);
          // Ganti harga di produk dengan harga final
          item.product.price = priceInfo.finalPrice;
          // Sisipkan juga detail priceInfo agar bisa digunakan di frontend jika perlu
          (item.product as any).priceInfo = priceInfo;
          return item;
        })
      );
      cart.items = processedItems;
    }

    return cart;
  }

  /**
   * Menambah item baru ke keranjang. Harga akan dihitung ulang secara otomatis.
   */
  async addItem(userId: string, addItemDto: AddItemDto) {
    const { productId, quantity } = addItemDto;
    const cart = await this.findOrCreateCart(userId);

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Produk dengan ID ${productId} tidak ditemukan.`);
    }

    const existingItem = await this.prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId },
    });

    const qtyInCart = existingItem?.quantity || 0;
    const requestedTotalQty = qtyInCart + quantity;

    if (product.stock < requestedTotalQty) {
      throw new UnprocessableEntityException(`Stok untuk produk ${product.name} tidak mencukupi.`);
    }

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
    // Kembalikan state keranjang terbaru, yang akan otomatis memanggil kalkulator harga
    return this.getCart(userId);
  }

  /**
   * Mengubah kuantitas item. Harga akan dihitung ulang secara otomatis.
   */
  async updateItemQuantity(
    userId: string,
    cartItemId: string,
    updateItemDto: UpdateItemDto,
  ) {
    const { quantity } = updateItemDto;
    if (quantity < 1) {
      throw new ForbiddenException(
        'Kuantitas tidak boleh kurang dari 1. Gunakan endpoint hapus untuk menghilangkan item.',
      );
    }

    const item = await this.prisma.cartItem.findFirst({
      where: { id: cartItemId, cart: { userId } },
      include: { product: true }
    });
    if (!item) {
      throw new ForbiddenException(
        'Akses ditolak. Item keranjang tidak ditemukan atau bukan milik Anda.',
      );
    }
    
    if(item.product.stock < quantity){
      throw new UnprocessableEntityException(`Stok untuk produk ${item.product.name} tidak mencukupi.`)
    }

    await this.prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity },
    });

    return this.getCart(userId);
  }

  /**
   * Menghapus satu item dari keranjang.
   */
  async removeItem(userId: string, cartItemId: string) {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: cartItemId, cart: { userId } },
    });

    if (!item) {
      console.warn(
        `Upaya menghapus item keranjang yang tidak ada: ${cartItemId} untuk user: ${userId}`,
      );
      return this.getCart(userId);
    }

    await this.prisma.cartItem.delete({
      where: { id: item.id },
    });

    return this.getCart(userId);
  }
}