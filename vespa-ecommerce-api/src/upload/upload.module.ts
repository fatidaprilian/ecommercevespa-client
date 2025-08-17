// file: vespa-ecommerce-api/src/upload/upload.module.ts
import { Module } from '@nestjs/common';
import { UploadController } from 'src/upload/upload.controller';
import { UploadService } from './upload.service';

@Module({
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}