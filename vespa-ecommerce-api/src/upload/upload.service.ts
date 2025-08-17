// file: vespa-ecommerce-api/src/upload/upload.service.ts

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Express } from 'express';
import { PrismaService } from 'src/prisma/prisma.service'; // <-- 1. Import PrismaService

function bufferToDataURI(buffer: Buffer, mimeType: string) {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

@Injectable()
export class UploadService {
  // 2. Suntikkan PrismaService
  constructor(private prisma: PrismaService) {}

  async uploadImageToCloudinary(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File tidak ditemukan.');
    }

    try {
      const fileStr = bufferToDataURI(file.buffer, file.mimetype);
      const result = await cloudinary.uploader.upload(fileStr, {
        folder: 'vespa_parts', // Folder umum untuk gambar produk
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

  // --- 3. TAMBAHKAN METHOD BARU DI SINI ---
  async uploadProofOfPayment(orderId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File bukti pembayaran tidak ditemukan.');
    }

    // Cari record payment yang terhubung dengan orderId
    const payment = await this.prisma.payment.findUnique({
        where: { orderId },
    });

    if (!payment) {
        throw new NotFoundException(`Data pembayaran untuk order ID ${orderId} tidak ditemukan.`);
    }

    try {
      const fileStr = bufferToDataURI(file.buffer, file.mimetype);
      const result = await cloudinary.uploader.upload(fileStr, {
        folder: 'proof_of_payments', // Folder khusus untuk bukti bayar
      });

      // Update record payment dengan URL gambar bukti bayar
      return this.prisma.payment.update({
          where: { id: payment.id },
          data: { proofOfPayment: result.secure_url }
      });

    } catch (error) {
      console.error('Cloudinary Upload Error (Proof of Payment):', error);
      throw new BadRequestException(`Upload bukti pembayaran gagal: ${error.message}`);
    }
  }
}