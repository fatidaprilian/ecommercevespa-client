// file: vespa-ecommerce-api/src/accurate-sync/accurate-sync.module.ts

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq'; 
import { AccurateSyncService } from './accurate-sync.service';
import { AccurateSyncController } from './accurate-sync.controller';
import { AccurateModule } from '../accurate/accurate.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AccurateSyncProcessor } from './accurate-sync.processor'; 

@Module({
  imports: [
    PrismaModule,
    AccurateModule,
    BullModule.registerQueue({
      name: 'accurate-sync-queue', 
    }),
  ],
  providers: [AccurateSyncService, AccurateSyncProcessor],
  controllers: [AccurateSyncController],
  exports: [AccurateSyncService]
})
export class AccurateSyncModule {}