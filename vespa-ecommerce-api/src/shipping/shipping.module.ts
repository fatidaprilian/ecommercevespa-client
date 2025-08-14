// file: vespa-ecommerce-api/src/shipping/shipping.module.ts

import { Module } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { ShippingController } from './shipping.controller';

@Module({
  providers: [ShippingService],
  controllers: [ShippingController],
  exports: [ShippingService], // Kita export agar bisa dipakai di modul Order nanti
})
export class ShippingModule {}