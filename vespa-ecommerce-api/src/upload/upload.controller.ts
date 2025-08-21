// file: vespa-ecommerce-api/src/upload/upload.controller.ts

import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Param,
  Body, // 1. Impor decorator Body
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Express } from 'express';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UploadProofDto } from './dto/upload-proof.dto'; // 2. Impor DTO yang akan kita buat

@Controller('upload')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    return this.uploadService.uploadImageToCloudinary(file);
  }

  // --- PERBAIKAN UTAMA DI SINI ---
  @Post('payment-proof/:orderId')
  @Roles(Role.RESELLER) // Hanya RESELLER yang bisa mengakses endpoint ini
  @UseInterceptors(FileInterceptor('file'))
  async uploadProofOfPayment(
    @Param('orderId') orderId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadProofDto: UploadProofDto, // 3. Terima data tambahan dari body request
  ) {
    // 4. Teruskan semua data (file dan ID bank) ke service
    return this.uploadService.uploadProofOfPayment(
      orderId,
      file,
      uploadProofDto.manualPaymentMethodId,
    );
  }
}