import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PrismaService } from 'src/prisma/prisma.service'; // <-- Impor

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, PrismaService], // <-- Tambahkan
})
export class ProductsModule {}