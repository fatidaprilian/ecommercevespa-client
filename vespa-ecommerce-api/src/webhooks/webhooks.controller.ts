// file: vespa-ecommerce-api/src/webhooks/webhooks.controller.ts

import { Controller, Post, Body, HttpCode, HttpStatus, Header } from '@nestjs/common';
import { Public } from 'src/auth/decorators/public.decorator';
import { WebhooksService } from './webhooks.service'; // Import service baru

@Controller('webhooks')
export class WebhooksController {
  // Suntikkan (inject) WebhooksService
  constructor(private readonly webhooksService: WebhooksService) {}

  @Public()
  @Post('biteship')
  @HttpCode(HttpStatus.OK)
  handleBiteshipWebhook(@Body() payload: any) {
    // Logika mentah dipindahkan ke service
    console.log('--- BITEShip WEBHOOK RECEIVED ---');
    console.log(JSON.stringify(payload, null, 2));
    
    // Panggil service untuk memproses payload
    this.webhooksService.handleBiteshipTrackingUpdate(payload);
    
    // Selalu kembalikan respons sukses ke Biteship agar tidak dikirim ulang
    return { message: 'Webhook received successfully' };
  }
}