// file: vespa-ecommerce-api/src/upload/upload.controller.ts

import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Express } from 'express';
import { UploadService } from './upload.service'; // <-- 1. IMPORT UPLOAD SERVICE

@Controller('upload')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UploadController {
  // 2. INJEKSI UPLOAD SERVICE KE DALAM CONSTRUCTOR
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    // 3. DELEGASIKAN LOGIKA UPLOAD KE SERVICE
    return this.uploadService.uploadImageToCloudinary(file);
  }
}