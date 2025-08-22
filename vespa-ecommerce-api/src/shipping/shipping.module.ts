// file: vespa-ecommerce-api/src/shipping/shipping.module.ts

import { Module } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { ShippingController } from './shipping.controller';
import { SettingsModule } from 'src/settings/settings.module'; // <-- 1. IMPORT SettingsModule

@Module({
  imports: [SettingsModule], // <-- 2. DAFTARKAN DI SINI
  providers: [ShippingService],
  controllers: [ShippingController],
  exports: [ShippingService],
})
export class ShippingModule {}