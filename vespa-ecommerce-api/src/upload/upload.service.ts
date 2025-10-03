// file: vespa-ecommerce-api/src/upload/upload.service.ts

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger, // <-- Tambahkan Logger
} from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Express } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';

function bufferToDataURI(buffer: Buffer, mimeType: string) {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name); // <-- Tambahkan Logger

  constructor(private prisma: PrismaService) {}

  async uploadImageToCloudinary(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File tidak ditemukan.');
    }

    try {
      const fileStr = bufferToDataURI(file.buffer, file.mimetype);
      const result = await cloudinary.uploader.upload(fileStr, {
        folder: 'vespa_parts', // Anda bisa ganti folder jika perlu, misal 'banners'
      });

      return {
        message: 'File berhasil di-upload',
        url: result.secure_url,
        public_id: result.public_id,
      };
    } catch (error) {
      this.logger.error('Cloudinary Upload Error:', error);
      throw new BadRequestException(`Upload ke Cloudinary gagal: ${error.message}`);
    }
  }

  // --- FUNGSI BARU UNTUK MENGHAPUS GAMBAR ---
  async deleteImageFromCloudinary(imageUrl: string) {
    if (!imageUrl) return;

    // Ekstrak public_id dari URL
    // Contoh URL: http://res.cloudinary.com/demo/image/upload/v1573112489/vespa_parts/sample.jpg
    // Kita butuh 'vespa_parts/sample'
    try {
      const publicId = imageUrl.split('/').slice(-2).join('/').split('.')[0];
      
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
        this.logger.log(`Gambar lama dengan public_id: ${publicId} berhasil dihapus.`);
      }
    } catch (error) {
      this.logger.error(`Gagal menghapus gambar lama dari Cloudinary: ${imageUrl}`, error);
      // Kita tidak melempar error di sini agar proses update utama tidak gagal
      // jika hanya proses hapus gambar yang gagal.
    }
  }
  // --- SELESAI ---

  async uploadProofOfPayment(
    orderId: string,
    file: Express.Multer.File,
    manualPaymentMethodId: string,
  ) {
    if (!file) {
      throw new BadRequestException('File bukti pembayaran tidak ditemukan.');
    }

    const payment = await this.prisma.payment.findUnique({
        where: { orderId },
    });

    if (!payment) {
        throw new NotFoundException(`Data pembayaran untuk order ID ${orderId} tidak ditemukan.`);
    }

    // Jika sudah ada bukti pembayaran lama, hapus dari Cloudinary
    if (payment.proofOfPayment) {
      await this.deleteImageFromCloudinary(payment.proofOfPayment);
    }

    try {
      const fileStr = bufferToDataURI(file.buffer, file.mimetype);
      const result = await cloudinary.uploader.upload(fileStr, {
        folder: 'proof_of_payments',
      });

      return this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            proofOfPayment: result.secure_url,
            manualPaymentMethodId: manualPaymentMethodId,
          }
      });

    } catch (error) {
      this.logger.error('Cloudinary Upload Error (Proof of Payment):', error);
      throw new BadRequestException(`Upload bukti pembayaran gagal: ${error.message}`);
    }
  }
}