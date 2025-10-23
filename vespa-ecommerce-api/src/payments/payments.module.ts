// file: src/payments/payments.module.ts

import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MidtransModule } from 'src/midtrans/midtrans.module';
import { ShipmentsModule } from 'src/shipments/shipments.module';
import { AccurateSyncModule } from 'src/accurate-sync/accurate-sync.module';
import { SettingsModule } from 'src/settings/settings.module'; // <-- Tambahkan impor ini

@Module({
  imports: [
    MidtransModule,
    ShipmentsModule, // Pastikan ini juga diimpor jika ShipmentsService dibutuhkan
    AccurateSyncModule, // Pastikan ini juga diimpor jika AccurateSyncService dibutuhkan
    SettingsModule // <-- Tambahkan SettingsModule di sini
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}