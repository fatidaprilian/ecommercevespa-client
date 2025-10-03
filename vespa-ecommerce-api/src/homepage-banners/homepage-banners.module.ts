// src/homepage-banners/homepage-banners.module.ts

import { Module } from '@nestjs/common';
import { HomepageBannersService } from './homepage-banners.service';
import { HomepageBannersController } from './homepage-banners.controller';
import { UploadService } from 'src/upload/upload.service'; // <-- Impor

@Module({
  controllers: [HomepageBannersController],
  providers: [HomepageBannersService, UploadService], // <-- Tambahkan UploadService
})
export class HomepageBannersModule {}