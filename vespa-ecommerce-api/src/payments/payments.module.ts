// file: src/payments/payments.module.ts

import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MidtransModule } from 'src/midtrans/midtrans.module';
import { ShipmentsModule } from 'src/shipments/shipments.module'; // <-- 1. IMPORT

@Module({
  imports: [MidtransModule, ShipmentsModule], // <-- 2. DAFTARKAN DI SINI
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService], 
})
export class PaymentsModule {}