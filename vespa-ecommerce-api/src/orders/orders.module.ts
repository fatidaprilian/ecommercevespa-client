// file: src/orders/orders.module.ts

import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PaymentsModule } from 'src/payments/payments.module';
import { DiscountsModule } from 'src/discounts/discounts.module'; // <-- 1. Impor DiscountsModule

@Module({
  imports: [
    PaymentsModule,
    DiscountsModule, // <-- 2. Daftarkan di sini
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}