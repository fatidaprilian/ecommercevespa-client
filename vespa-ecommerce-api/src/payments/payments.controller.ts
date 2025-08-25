// file: src/payments/payments.controller.ts

import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Public } from 'src/auth/decorators/public.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Public() 
  @Post('midtrans-webhook')
  @HttpCode(HttpStatus.OK)
  handleMidtransWebhook(@Body() body: any) {
    console.log("Received Midtrans Webhook:", body);
    return this.paymentsService.handleMidtransCallback(body);
  }
}