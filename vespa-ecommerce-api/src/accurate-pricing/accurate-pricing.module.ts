// src/accurate-pricing/accurate-pricing.module.ts

import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { AccuratePricingService } from './accurate-pricing.service';
import { AccuratePricingController } from './accurate-pricing.controller';
import { AccurateModule } from '../accurate/accurate.module';
import { ConfigService } from '@nestjs/config';
import { AccurateSyncModule } from '../accurate-sync/accurate-sync.module';

@Module({
  imports: [
    AccurateModule,
    CacheModule.register({
      ttl: 600000,
      max: 1000,
    }),
    AccurateSyncModule,
  ],
  controllers: [AccuratePricingController],
  providers: [AccuratePricingService],
  exports: [AccuratePricingService],
})
export class AccuratePricingModule {}