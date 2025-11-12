// file: src/products/price-calculator.service.ts

import { Injectable } from '@nestjs/common';
import { Product, ProductPriceTier, PriceAdjustmentRule } from '@prisma/client';

type ProductWithRules = Product & {
  priceTiers?: ProductPriceTier[];
  priceAdjustmentRules?: PriceAdjustmentRule[];
};

@Injectable()
export class PriceCalculatorService {
  calculateFinalPrice(product: ProductWithRules, accuratePriceCategoryId?: number | null): number {
    let finalPrice = Number(product.price);

    // LAYER 1: Base Price Override (Tier)
    // Hanya berjalan jika user punya kategori spesifik dari Accurate
    if (accuratePriceCategoryId && product.priceTiers && product.priceTiers.length > 0) {
      const tierMatch = product.priceTiers.find(
        (tier) => tier.accuratePriceCategoryId === accuratePriceCategoryId
      );
      if (tierMatch) {
        finalPrice = Number(tierMatch.price);
      }
    }

    // LAYER 2: Diskon Tambahan (Rules) - OPSI A: NILAI TERBAIK (TIDAK STACKING)
    if (product.priceAdjustmentRules && product.priceAdjustmentRules.length > 0) {
      const now = new Date();

      const applicableRules = product.priceAdjustmentRules
        .filter(
          (rule) =>
            rule.isActive &&
            // FIX: Cocok dengan kategori user ATAU rule bersifat umum (null)
            (rule.accuratePriceCategoryId === accuratePriceCategoryId || rule.accuratePriceCategoryId === null) &&
            // FIX: Pastikan tanggal mulai sudah lewat (jika diset)
            (!rule.startDate || new Date(rule.startDate) <= now)
        )
        // FIX: Sorting berdasarkan NILAI diskon terbesar (descending) agar yang terbaik ada di urutan pertama
        .sort((a, b) => Number(b.discountValue) - Number(a.discountValue));

      // FIX OPSI A: Hanya ambil SATU rule terbaik (indeks 0 setelah sorting)
      if (applicableRules.length > 0) {
        const bestRule = applicableRules[0];

        if (bestRule.discountType === 'PERCENTAGE') {
          finalPrice -= finalPrice * (Number(bestRule.discountValue) / 100);
        } else if (bestRule.discountType === 'FIXED_DISCOUNT') {
          finalPrice -= Number(bestRule.discountValue);
        }
      }
    }

    return Math.max(0, finalPrice);
  }

  calculateMany(products: ProductWithRules[], accuratePriceCategoryId?: number | null) {
    return products.map((product) => {
      const finalPrice = this.calculateFinalPrice(product, accuratePriceCategoryId);
      return {
        ...product,
        price: finalPrice,
        finalPrice: finalPrice,
      };
    });
  }
}