// file: vespa-ecommerce-api/src/accurate-sync/accurate-sync.module.ts

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq'; // <-- 1. IMPORT BARU
import { AccurateSyncService } from './accurate-sync.service';
import { AccurateSyncController } from './accurate-sync.controller';
import { AccurateModule } from '../accurate/accurate.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AccurateSyncProcessor } from './accurate-sync.processor'; // <-- 2. IMPORT PROCESSOR BARU

@Module({
  imports: [
    PrismaModule,
    AccurateModule,
    // --- DAFTARKAN ANTREAN DI SINI ---
    BullModule.registerQueue({
      name: 'accurate-sync-queue', // Nama antrean kita
    }),
    // ---------------------------------
  ],
  // 3. Daftarkan Processor dan Service
  providers: [AccurateSyncService, AccurateSyncProcessor],
  controllers: [AccurateSyncController],
  exports: [AccurateSyncService]
})
export class AccurateSyncModule {}