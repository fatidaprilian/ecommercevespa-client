// file: vespa-ecommerce-api/src/settings/settings.module.ts

import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';

@Module({
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService], // Ekspor agar bisa dipakai service lain
})
export class SettingsModule {}