// src/orders/orders.module.ts
import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, PrismaService], // <-- Tambahkan PrismaService
})
export class OrdersModule {}