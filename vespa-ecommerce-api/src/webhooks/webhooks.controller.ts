// file: vespa-ecommerce-api/src/webhooks/webhooks.controller.ts

import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { Public } from 'src/auth/decorators/public.decorator';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  @Public()
  @Post('accurate')
  @HttpCode(HttpStatus.OK)
  handleAccurateWebhook(@Body() payload: any) {
    this.logger.log('--- ACCURATE WEBHOOK RECEIVED ---');
    // Payload dari Accurate bisa berupa array, kita ambil elemen pertama
    const webhookData = Array.isArray(payload) ? payload[0] : payload;
    this.logger.log(JSON.stringify(webhookData, null, 2));
    
    // Panggil handler utama di service
    this.webhooksService.handleAccurateWebhook(webhookData);
    
    return { message: 'Accurate webhook received successfully' };
  }

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