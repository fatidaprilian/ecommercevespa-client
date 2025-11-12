// file: src/cart/cart.module.ts

import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { DiscountsModule } from 'src/discounts/discounts.module';
import { ProductsModule } from 'src/products/products.module'; // <-- TAMBAHAN PENTING

@Module({
  imports: [
    DiscountsModule,
    ProductsModule, // <-- DAFTARKAN DI SINI
  ],
  providers: [CartService],
  controllers: [CartController],
  exports: [CartService],
})
export class CartModule {}