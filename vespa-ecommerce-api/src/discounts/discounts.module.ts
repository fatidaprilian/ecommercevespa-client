// file: src/discounts/discounts.module.ts

import { Module } from '@nestjs/common';
import { DiscountsService } from './discounts.service';
import { DiscountsController } from './discounts.controller';
import { DiscountsCalculationService } from './discounts-calculation.service';

@Module({
  controllers: [DiscountsController],
  providers: [DiscountsService, DiscountsCalculationService],
  exports: [DiscountsCalculationService],
})
export class DiscountsModule {}