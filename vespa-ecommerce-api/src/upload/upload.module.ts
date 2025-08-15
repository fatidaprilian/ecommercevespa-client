import { Module } from '@nestjs/common';
import { UploadController } from 'src/upload/upload.controller';
// Import dan sediakan UploadService
import { UploadService } from './upload.service';

@Module({
  controllers: [UploadController],
  // Daftarkan UploadService sebagai provider
  providers: [UploadService],
})
export class UploadModule {}