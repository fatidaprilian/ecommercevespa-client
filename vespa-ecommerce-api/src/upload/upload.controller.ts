// file: vespa-ecommerce-api/src/upload/upload.controller.ts

import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Param,
  Body,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Express } from 'express';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UploadProofDto } from './dto/upload-proof.dto';

@Controller('upload')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * Endpoint baru untuk upload gambar umum oleh Admin.
   * Digunakan untuk banner, halaman CMS, dll.
   */
  @Post('image')
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB limit
          new FileTypeValidator({ fileType: 'image/(jpeg|png|gif|webp)' }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const result = await this.uploadService.uploadImageToCloudinary(file);
    
    // --- PERBAIKAN DI SINI ---
    // Langsung gunakan result.url karena service sudah memformatnya.
    return {
      message: 'Gambar berhasil diunggah',
      url: result.url, 
    };
  }

  /**
   * Endpoint untuk upload bukti pembayaran.
   * Hak akses diubah menjadi MEMBER dan RESELLER agar bisa diakses pembeli.
   */
  @Post('payment-proof/:orderId')
  @Roles(Role.MEMBER, Role.RESELLER)
  @UseInterceptors(FileInterceptor('file'))
  async uploadProofOfPayment(
    @Param('orderId') orderId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB limit
          new FileTypeValidator({ fileType: 'image/(jpeg|png|gif|webp)' }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() uploadProofDto: UploadProofDto,
  ) {
    return this.uploadService.uploadProofOfPayment(
      orderId,
      file,
      uploadProofDto.manualPaymentMethodId,
    );
  }
}