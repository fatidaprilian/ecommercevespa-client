import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PaymentsModule } from 'src/payments/payments.module';
import { DiscountsModule } from 'src/discounts/discounts.module';
import { AccurateSyncModule } from 'src/accurate-sync/accurate-sync.module';
// --- 1. IMPORT MODUL YANG DIBUTUHKAN ---
import { SettingsModule } from 'src/settings/settings.module';
import { OrderCompletionService } from './order-completion.service';

@Module({
  // --- 2. TAMBAHKAN MODULNYA DI SINI ---
  imports: [
    PaymentsModule,
    DiscountsModule,
    AccurateSyncModule,
    SettingsModule, // <-- Tambahkan baris ini
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrderCompletionService],
})
export class OrdersModule {}