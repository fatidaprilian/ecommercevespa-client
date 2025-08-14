// file: vespa-ecommerce-api/src/cart/cart.module.ts

import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';

@Module({
  controllers: [CartController],
  providers: [CartService],
})
export class CartModule {}