// file: src/products/products.module.ts

import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { DiscountsModule } from 'src/discounts/discounts.module'; // <-- Tambah import

@Module({
  imports: [DiscountsModule], // <-- Daftarkan di sini
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}