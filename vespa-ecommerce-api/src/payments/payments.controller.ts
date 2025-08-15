// file: vespa-ecommerce-api/src/payments/payments.controller.ts

import { Controller, Post, Body, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Public } from 'src/auth/decorators/public.decorator';

@Public()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // --- PERBAIKAN UTAMA DI SINI ---
  // Ubah 'webhook/xendit' menjadi 'xendit-webhook' agar cocok dengan URL Xendit
  @Post('xendit-webhook')
  @HttpCode(HttpStatus.OK)
  handleXenditWebhook(@Headers() headers: any, @Body() body: any) {
    // Pastikan Anda masih menggunakan kode debugging di service untuk melihat log token
    return this.paymentsService.handleXenditCallback(body, headers);
  }
}