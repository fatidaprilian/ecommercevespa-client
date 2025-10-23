// file: src/payments/payments.controller.ts

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Param, // <-- Ditambahkan
  UseGuards, // <-- Ditambahkan
  Req, // <-- Ditambahkan
  Logger // <-- Ditambahkan (opsional untuk logging)
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Public } from 'src/auth/decorators/public.decorator';
import { AuthGuard } from '@nestjs/passport'; // <-- Ditambahkan
import { AuthenticatedRequest } from 'src/auth/interfaces/authenticated-request.interface'; // <-- Ditambahkan
import { RetryPaymentDto } from './dto/retry-payment.dto'; // <-- Ditambahkan

@Controller('payments')
export class PaymentsController {
  // Logger opsional untuk debugging tambahan
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Public()
  @Post('midtrans-webhook')
  @HttpCode(HttpStatus.OK)
  handleMidtransWebhook(@Body() body: any) {
    // --- Logging lebih detail ---
    this.logger.log(`Received Midtrans Webhook for Order ID: ${body.order_id}`);
    this.logger.debug(`Webhook Payload: ${JSON.stringify(body)}`); // Hati-hati jika ada data sensitif
    // --------------------------
    // Panggil service (tidak perlu await agar respons cepat)
    this.paymentsService.handleMidtransCallback(body);
    // Kembalikan respons OK segera
    return { message: "Webhook received" };
  }

  // --- ENDPOINT BARU UNTUK RETRY PAYMENT ---
  @Post('order/:orderId/retry') // Endpoint baru
  @UseGuards(AuthGuard('jwt')) // Memerlukan login
  @HttpCode(HttpStatus.OK)
  async retryPayment(
    @Param('orderId') orderId: string, // Ambil orderId dari URL
    @Req() req: AuthenticatedRequest, // Dapatkan info user yang login
    @Body() retryPaymentDto: RetryPaymentDto // Dapatkan preferensi (jika ada) dari body
  ) {
    const userId = req.user.id; // Ambil ID user
    this.logger.log(`Received retry payment request for Order ID: ${orderId} by User ID: ${userId}`);
    // Panggil service untuk proses retry
    return this.paymentsService.retryPaymentForOrder(orderId, userId, retryPaymentDto);
  }
  // --- ENDPOINT BARU SELESAI ---

}