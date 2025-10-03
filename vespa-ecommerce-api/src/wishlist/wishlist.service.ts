// src/wishlist/wishlist.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProductsService } from 'src/products/products.service';
import { UserPayload } from 'src/auth/interfaces/jwt.payload';

@Injectable()
export class WishlistService {
  constructor(
    private prisma: PrismaService,
    private productsService: ProductsService,
  ) {}

  async getWishlist(user: UserPayload) {
    const wishlistItems = await this.prisma.wishlist.findMany({
      where: { userId: user.id },
      include: {
        product: {
          include: {
            images: true,
            brand: true,
            category: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Proses setiap produk untuk menyertakan priceInfo
    const processedItems = await Promise.all(
      wishlistItems.map(async (item) => {
        // Pastikan produk tidak null sebelum diproses
        if (!item.product) {
            return item;
        }
        const processedProduct = await this.productsService.processProductWithPrice(item.product, user);
        return { ...item, product: processedProduct };
      })
    );

    return processedItems;
  }

  async getWishlistProductIds(userId: string): Promise<string[]> {
    const wishlistItems = await this.prisma.wishlist.findMany({
      where: { userId },
      select: {
        productId: true,
      },
    });
    return wishlistItems.map((item) => item.productId);
  }

  async addToWishlist(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Produk dengan ID ${productId} tidak ditemukan.`);
    }

    return this.prisma.wishlist.create({
      data: {
        userId,
        productId,
      },
    });
  }

  async removeFromWishlist(userId: string, productId: string) {
    try {
      await this.prisma.wishlist.delete({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
      });
      return { message: 'Produk berhasil dihapus dari wishlist.' };
    } catch (error) {
      return { message: 'Produk tidak ditemukan di wishlist atau sudah dihapus.' };
    }
  }
}