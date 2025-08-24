// file: vespa-ecommerce-api/src/webhooks/webhooks.controller.ts

import { Controller, Post, Body, HttpCode, HttpStatus, Header, Logger } from '@nestjs/common'; // Impor Logger
import { Public } from 'src/auth/decorators/public.decorator';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  // 👇 Tambahkan Logger untuk debugging
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  // 👇 --- ENDPOINT BARU UNTUK ACCURATE --- 👇
  @Public()
  @Post('accurate')
  @HttpCode(HttpStatus.OK)
  handleAccurateWebhook(@Body() payload: any) {
    this.logger.log('--- ACCURATE WEBHOOK RECEIVED ---');
    this.logger.log(JSON.stringify(payload, null, 2));
    
    // Asumsi webhook ini untuk event "Save Sales Invoice"
    this.webhooksService.handleAccurateSalesInvoiceCreated(payload);
    
    return { message: 'Accurate webhook received successfully' };
  }
  // 👆 --- AKHIR ENDPOINT BARU --- 👆


  // Endpoint untuk Biteship (tidak diubah)
  @Public()
  @Post('biteship')
  @HttpCode(HttpStatus.OK)
  handleBiteshipWebhook(@Body() payload: any) {
    this.logger.log('--- BITEShip WEBHOOK RECEIVED ---');
    this.logger.log(JSON.stringify(payload, null, 2));
    
    this.webhooksService.handleBiteshipTrackingUpdate(payload);
    
    return { message: 'Webhook received successfully' };
  }
}