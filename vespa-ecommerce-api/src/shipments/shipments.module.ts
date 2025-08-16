// file: src/shipments/shipments.module.ts
import { Module } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { ShipmentsController } from './shipments.controller';

@Module({
  providers: [ShipmentsService],
  controllers: [ShipmentsController],
  // --- TAMBAHKAN BARIS INI UNTUK MEMPERBAIKI ERROR ---
  exports: [ShipmentsService],
})
export class ShipmentsModule {}