// file: src/discounts/discounts.module.ts

import { Module } from '@nestjs/common';
import { DiscountsService } from './discounts.service';
import { DiscountsController } from './discounts.controller';
import { DiscountsCalculationService } from './discounts-calculation.service'; // <-- Tambah import

@Module({
  controllers: [DiscountsController],
  providers: [DiscountsService, DiscountsCalculationService], // <-- Tambah service baru
  exports: [DiscountsCalculationService], // <-- Ekspor service baru
})
export class DiscountsModule {}