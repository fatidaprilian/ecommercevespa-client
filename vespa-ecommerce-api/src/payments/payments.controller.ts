// src/payments/payments.controller.ts

import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { AuthGuard } from '@nestjs/passport';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { AuthenticatedRequest } from 'src/auth/interfaces/authenticated-request.interface';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Endpoint untuk user yang sudah login untuk membuat sesi pembayaran.
   */
  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(
    @Body() createPaymentDto: CreatePaymentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    return this.paymentsService.createPayment(createPaymentDto, userId);
  }

  /**
   * Endpoint publik untuk menerima notifikasi webhook dari Xendit.
   */
  @Post('xendit-webhook')
  async handleXenditWebhook(
    @Headers('x-callback-token') callbackToken: string,
    @Body() payload: any,
  ) {
    const expectedToken = process.env.XENDIT_WEBHOOK_TOKEN;

    // --- BLOK DEBUGGING ---
    // Mencetak token yang diterima dan yang diharapkan untuk perbandingan.
    // Tanda kurung siku `[]` membantu melihat adanya spasi yang tidak terlihat.
    console.log('--- WEBHOOK TOKEN DEBUG ---');
    console.log(`Token dari Header Xendit: [${callbackToken}]`);
    console.log(`Token dari file .env     : [${expectedToken}]`);
    console.log(`Apakah cocok? (Strict)   : ${callbackToken === expectedToken}`);
    console.log('---------------------------');
    // --- AKHIR BLOK DEBUGGING ---

    // Memvalidasi token untuk memastikan request datang dari Xendit.
    if (callbackToken !== expectedToken) {
      throw new UnauthorizedException('Invalid callback token');
    }

    // Jika token valid, teruskan payload ke service untuk diproses.
    return this.paymentsService.processWebhook(payload);
  }
}