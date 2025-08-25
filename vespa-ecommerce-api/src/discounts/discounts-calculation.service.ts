// file: src/discounts/discounts-calculation.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Product, User } from '@prisma/client';

export interface CalculatedPrice {
  originalPrice: number;
  discountPercentage: number;
  finalPrice: number;
  appliedRule: 'PRODUCT' | 'CATEGORY' | 'DEFAULT' | 'NONE';
}

@Injectable()
export class DiscountsCalculationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Menghitung harga akhir sebuah produk untuk user tertentu
   * berdasarkan hierarki aturan diskon.
   * @param user - Objek User yang sedang login
   * @param product - Objek Produk yang harganya akan dihitung
   * @returns Objek CalculatedPrice
   */
  async calculatePrice(user: User, product: Product): Promise<CalculatedPrice> {
    const originalPrice = product.price;
    let discountPercentage = 0;
    let appliedRule: 'PRODUCT' | 'CATEGORY' | 'DEFAULT' | 'NONE' = 'NONE';

    const productDiscount = await this.prisma.userProductDiscount.findUnique({
      where: { userId_productId: { userId: user.id, productId: product.id } },
    });

    if (productDiscount) {
      discountPercentage = productDiscount.discountPercentage;
      appliedRule = 'PRODUCT';
    } else if (product.categoryId) {
      const categoryDiscount = await this.prisma.userCategoryDiscount.findUnique({
        where: { userId_categoryId: { userId: user.id, categoryId: product.categoryId } },
      });

      if (categoryDiscount) {
        discountPercentage = categoryDiscount.discountPercentage;
        appliedRule = 'CATEGORY';
      } else {
        discountPercentage = user.defaultDiscountPercentage;
        appliedRule = discountPercentage > 0 ? 'DEFAULT' : 'NONE';
      }
    } else {
        discountPercentage = user.defaultDiscountPercentage;
        appliedRule = discountPercentage > 0 ? 'DEFAULT' : 'NONE';
    }

    const finalPrice = originalPrice - (originalPrice * (discountPercentage / 100));

    return {
      originalPrice,
      discountPercentage,
      finalPrice,
      appliedRule,
    };
  }
}