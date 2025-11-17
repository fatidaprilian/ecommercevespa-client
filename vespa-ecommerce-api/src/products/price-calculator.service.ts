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
    // ======================= PERUBAHAN DI SINI =======================
    // Diubah untuk sorting berdasarkan 'name' (SPA...) agar mengambil tier terbaru
    if (accuratePriceCategoryId && product.priceTiers && product.priceTiers.length > 0) {
      
      const applicableTiers = product.priceTiers
        .filter((tier) => tier.accuratePriceCategoryId === accuratePriceCategoryId)
        .sort((a, b) => (b.name || '').localeCompare(a.name || '')); // Urutkan terbaru

      // Ambil tier terbaru (indeks 0)
      if (applicableTiers.length > 0) {
        finalPrice = Number(applicableTiers[0].price);
      }
    }
    // ===================== AKHIR PERUBAHAN LAYER 1 =====================


    // LAYER 2: Diskon Tambahan (Rules) - LOGIKA BARU: ATURAN TERBARU
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
        // (Ini sudah benar dari fix kita sebelumnya)
        .sort((a, b) => (b.name || '').localeCompare(a.name || ''));


      // Ambil SATU rule terbaru (indeks 0 setelah sorting)
      if (applicableRules.length > 0) {
        const latestRule = applicableRules[0]; // Diganti nama dari bestRule -> latestRule

        if (latestRule.discountType === 'PERCENTAGE') {
          finalPrice -= finalPrice * (Number(latestRule.discountValue) / 100);
        } else if (latestRule.discountType === 'FIXED_DISCOUNT') {
          finalPrice -= Number(latestRule.discountValue);
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