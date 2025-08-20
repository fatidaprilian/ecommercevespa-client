// file: vespa-ecommerce-api/src/accurate-sync/accurate-sync.module.ts

import { Module } from '@nestjs/common';
import { AccurateSyncService } from './accurate-sync.service';
import { AccurateSyncController } from './accurate-sync.controller';
import { AccurateModule } from '../accurate/accurate.module'; // <-- IMPORT AccurateModule

@Module({
  imports: [AccurateModule], // <-- TAMBAHKAN AccurateModule di sini
  providers: [AccurateSyncService],
  controllers: [AccurateSyncController]
})
export class AccurateSyncModule {}