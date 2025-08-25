// src/shipments/shipments.module.ts

import { Module } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { ShipmentsController } from './shipments.controller';
import { ShippingModule } from 'src/shipping/shipping.module';

@Module({
  imports: [ShippingModule],
  providers: [ShipmentsService],
  controllers: [ShipmentsController],
  exports: [ShipmentsService],
})
export class ShipmentsModule {}