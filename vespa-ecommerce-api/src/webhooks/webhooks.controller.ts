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
  async handleAccurateWebhook(@Body() payload: any) {
    this.logger.log('--- ACCURATE WEBHOOK RECEIVED ---');
    this.logger.log(
      `Raw payload type: ${Array.isArray(payload) ? 'ARRAY' : 'OBJECT'}`
    );
    this.logger.log(JSON.stringify(payload, null, 2));

    // 🔑 Normalisasi: selalu jadikan array agar bisa loop semua event
    const events = Array.isArray(payload) ? payload : [payload];

    for (const event of events) {
      try {
        this.logger.log(
          `[AccurateWebhook] Processing event type="${event?.type}" uuid="${event?.uuid ?? 'N/A'}"`
        );
        await this.webhooksService.handleAccurateWebhook(event);
      } catch (err: any) {
        this.logger.error(
          `❌ Error processing Accurate webhook event type="${event?.type}": ${err.message}`,
          err.stack,
        );
      }
    }

    return { message: 'Accurate webhook received successfully' };
  }

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
