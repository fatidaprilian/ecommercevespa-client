// file: src/orders/orders.module.ts

import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PaymentsModule } from 'src/payments/payments.module';
import { DiscountsModule } from 'src/discounts/discounts.module';
import { AccurateSyncModule } from 'src/accurate-sync/accurate-sync.module';
import { SettingsModule } from 'src/settings/settings.module';
import { OrderCompletionService } from './order-completion.service';
import { OrderExpirationService } from './order-expiration.service';
import { EmailModule } from 'src/email/email.module';
// 👇👇 UBAH INI: Ganti AccuratePricingModule dengan ProductsModule 👇👇
import { ProductsModule } from 'src/products/products.module';
// 👆👆 AKHIR UBAHAN 👆👆

@Module({
  imports: [
    PaymentsModule,
    DiscountsModule,
    AccurateSyncModule,
    SettingsModule,
    EmailModule,
    // 👇👇 DAFTARKAN MODULE BARU DI SINI 👇👇
    ProductsModule,
    // 👆👆 ------------------------------- 👆👆
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrderCompletionService,
    OrderExpirationService,
  ],
})
export class OrdersModule {}