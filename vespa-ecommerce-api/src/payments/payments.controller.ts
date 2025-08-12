import { Body, Controller, Post, Req, UseGuards, Headers } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  create(@Req() req: any, @Body() createPaymentDto: CreatePaymentDto) {
    const userId = req.user.id;
    // Urutan argumen sudah benar: (string, dto)
    return this.paymentsService.createPayment(userId, createPaymentDto);
  }

  @Post('webhook')
  webhook(@Headers() headers: any, @Body() body: any) {
    // Nama method sudah benar: handleWebhook
    return this.paymentsService.handleWebhook(headers, body);
  }
}