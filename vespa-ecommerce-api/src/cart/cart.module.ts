// file: vespa-ecommerce-api/src/cart/cart.module.ts

import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';

@Module({
  providers: [CartService],
  controllers: [CartController],
  exports: [CartService], // Export jika diperlukan modul lain
})
export class CartModule {}