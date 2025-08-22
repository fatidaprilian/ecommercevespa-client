// file: src/cart/cart.module.ts

import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { DiscountsModule } from 'src/discounts/discounts.module'; // <-- 1. Impor DiscountsModule

@Module({
  imports: [DiscountsModule], // <-- 2. Daftarkan di sini
  providers: [CartService],
  controllers: [CartController],
  exports: [CartService],
})
export class CartModule {}