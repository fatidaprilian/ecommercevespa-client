// file: src/products/products.module.ts

import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { DiscountsModule } from 'src/discounts/discounts.module';
import { AccuratePricingModule } from '../accurate-pricing/accurate-pricing.module';
// Import service baru kita
import { PriceCalculatorService } from './price-calculator.service';

@Module({
  imports: [
    DiscountsModule,
    AccuratePricingModule, // Tetap ada sesuai request Anda
  ],
  controllers: [ProductsController],
  providers: [
    ProductsService,
    PriceCalculatorService, // <-- WAJIB ADA: agar bisa di-inject ke ProductsService
  ],
  exports: [
    ProductsService,
    PriceCalculatorService, // Opsional: export jika module lain butuh
  ],
})
export class ProductsModule {}