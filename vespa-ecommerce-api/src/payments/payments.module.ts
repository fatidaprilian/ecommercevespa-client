// src/payments/payments.module.ts

import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { XenditModule } from 'src/xendit/xendit.module';

@Module({
  imports: [XenditModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  // ---- TAMBAHKAN BARIS INI ----
  exports: [PaymentsService], 
})
export class PaymentsModule {}