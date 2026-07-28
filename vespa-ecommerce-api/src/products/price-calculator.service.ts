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
    // Use the most recent SPA tier (determined by natural sort on the tier name)
    if (accuratePriceCategoryId && product.priceTiers && product.priceTiers.length > 0) {
      
      const applicableTiers = product.priceTiers
        .filter((tier) => tier.accuratePriceCategoryId === accuratePriceCategoryId)
        .sort((a, b) => (b.name || '').localeCompare(a.name || '', undefined, { numeric: true }));

      // Apply the most recent tier
      if (applicableTiers.length > 0) {
        finalPrice = Number(applicableTiers[0].price);
      }
    }



    // LAYER 2: Additional Discounts (Rules)
    if (product.priceAdjustmentRules && product.priceAdjustmentRules.length > 0) {
      const now = new Date();

      const applicableRules = product.priceAdjustmentRules
        .filter(
          (rule) =>
            rule.isActive &&
            // Matches user's category or applies globally (null)
            (rule.accuratePriceCategoryId === accuratePriceCategoryId || rule.accuratePriceCategoryId === null) &&
            // Check if start date is valid
            (!rule.startDate || new Date(rule.startDate) <= now)
        )
        .sort((a, b) => (b.name || '').localeCompare(a.name || '', undefined, { numeric: true }));

      // Apply the single most recent rule
      if (applicableRules.length > 0) {
        const latestRule = applicableRules[0];

        if (latestRule.discountType === 'PERCENTAGE') {
          finalPrice -= finalPrice * (Number(latestRule.discountValue) / 100);
        } else if (latestRule.discountType === 'FIXED_DISCOUNT') {
          finalPrice -= Number(latestRule.discountValue);
        } else if (latestRule.discountType === 'FIXED_PRICE') {
          finalPrice = Number(latestRule.discountValue);
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