// file: vespa-ecommerce-api/src/xendit/xendit.module.ts

import { Module } from '@nestjs/common';
import { XenditService } from './xendit.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [XenditService],
  exports: [XenditService],
})
export class XenditModule {}