import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Express } from 'express';

// Fungsi helper untuk mengubah buffer menjadi data URI
function bufferToDataURI(buffer: Buffer, mimeType: string) {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

@Injectable()
export class UploadService {
  async uploadImageToCloudinary(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File tidak ditemukan.');
    }

    try {
      const fileStr = bufferToDataURI(file.buffer, file.mimetype);
      const result = await cloudinary.uploader.upload(fileStr, {
        folder: 'vespa_parts',
      });

      return {
        message: 'File berhasil di-upload',
        url: result.secure_url,
        public_id: result.public_id,
      };
    } catch (error) {
      console.error('Cloudinary Upload Error:', error);
      throw new BadRequestException(`Upload ke Cloudinary gagal: ${error.message}`);
    }
  }
}