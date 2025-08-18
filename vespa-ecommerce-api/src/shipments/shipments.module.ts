// src/shipments/shipments.module.ts

import { Module } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { ShipmentsController } from './shipments.controller';
import { ShippingModule } from 'src/shipping/shipping.module'; // ✅ 1. Import modul yang dibutuhkan

@Module({
  imports: [ShippingModule], // ✅ 2. Daftarkan di sini
  providers: [ShipmentsService],
  controllers: [ShipmentsController],
  exports: [ShipmentsService],
})
export class ShipmentsModule {}