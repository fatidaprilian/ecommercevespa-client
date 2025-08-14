// file: vespa-ecommerce-api/src/upload/upload.module.ts

import { Module } from '@nestjs/common';
import { UploadController } from 'src/upload/upload.controller';

@Module({
  controllers: [UploadController],
  // Kita tidak butuh service karena logikanya sederhana dan bisa langsung di controller
})
export class UploadModule {}