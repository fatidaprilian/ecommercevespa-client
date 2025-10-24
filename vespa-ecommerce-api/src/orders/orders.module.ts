// src/orders/orders.module.ts

import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PaymentsModule } from 'src/payments/payments.module';
import { DiscountsModule } from 'src/discounts/discounts.module';
import { AccurateSyncModule } from 'src/accurate-sync/accurate-sync.module';
import { SettingsModule } from 'src/settings/settings.module';
import { OrderCompletionService } from './order-completion.service';
// 1. IMPORT SERVICE YANG HILANG
import { OrderExpirationService } from './order-expiration.service'; 

@Module({
  imports: [
    PaymentsModule,
    DiscountsModule,
    AccurateSyncModule,
    SettingsModule,
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrderCompletionService,
    OrderExpirationService, // 2. TAMBAHKAN DI SINI
  ],
})
export class OrdersModule {}