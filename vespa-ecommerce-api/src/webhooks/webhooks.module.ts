// file: vespa-ecommerce-api/src/webhooks/webhooks.module.ts

import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { AccurateModule } from 'src/accurate/accurate.module';

@Module({
  imports: [AccurateModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}