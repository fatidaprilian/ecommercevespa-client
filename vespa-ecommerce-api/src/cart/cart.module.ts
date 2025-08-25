// file: src/cart/cart.module.ts

import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { DiscountsModule } from 'src/discounts/discounts.module';

@Module({
  imports: [DiscountsModule],
  providers: [CartService],
  controllers: [CartController],
  exports: [CartService],
})
export class CartModule {}