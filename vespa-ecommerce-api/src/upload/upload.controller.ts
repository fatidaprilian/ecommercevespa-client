// file: vespa-ecommerce-api/src/upload/upload.controller.ts

import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import { Express } from 'express'; 

// Fungsi helper untuk mengubah buffer menjadi data URI
function bufferToDataURI(buffer: Buffer, mimeType: string) {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

@Controller('upload')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UploadController {
  
  @Post()
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) { // Tipe data file sudah benar sekarang
    if (!file) {
      throw new BadRequestException('File tidak ditemukan dalam request.');
    }

    try {
      // Ubah buffer file menjadi format data URI yang bisa diterima Cloudinary
      const fileStr = bufferToDataURI(file.buffer, file.mimetype);

      // Gunakan metode 'upload' yang benar
      const result = await cloudinary.uploader.upload(fileStr, {
        folder: 'vespa_parts', // Folder di Cloudinary
        // public_id: `some_unique_name` // Opsional: jika ingin nama file custom
      });

      return {
        message: 'File berhasil di-upload',
        url: result.secure_url,
        public_id: result.public_id, // Kembalikan juga public_id untuk referensi
      };

    } catch (error) {
      console.error('Cloudinary Upload Error:', error); // Log error untuk debugging
      throw new BadRequestException(`Upload ke Cloudinary gagal: ${error.message}`);
    }
  }
}