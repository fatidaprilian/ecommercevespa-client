// file: vespa-ecommerce-api/src/upload/upload.service.ts

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Express } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';

function bufferToDataURI(buffer: Buffer, mimeType: string) {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private prisma: PrismaService) {}

  async uploadImageToCloudinary(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File tidak ditemukan.');
    }

    try {
      const fileStr = bufferToDataURI(file.buffer, file.mimetype);
      
      // Upload dengan auto-resize yang benar
      const result = await cloudinary.uploader.upload(fileStr, {
        folder: 'vespa_parts',
        // Langsung resize saat upload (bukan eager)
        width: 1500,
        height: 1500,
        crop: 'limit',
        quality: 'auto:good',
        format: 'jpg', // Force JPG untuk consistency
      });

      this.logger.log(`✅ Image uploaded and resized: ${result.public_id}`);

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

  async deleteImageFromCloudinary(imageUrl: string) {
    if (!imageUrl) return;

    try {
      const publicId = imageUrl.split('/').slice(-2).join('/').split('.')[0];
      
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
        this.logger.log(`Gambar lama dengan public_id: ${publicId} berhasil dihapus.`);
      }
    } catch (error) {
      this.logger.error(`Gagal menghapus gambar lama dari Cloudinary: ${imageUrl}`, error);
    }
  }

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

    if (payment.proofOfPayment) {
      await this.deleteImageFromCloudinary(payment.proofOfPayment);
    }

    try {
      const fileStr = bufferToDataURI(file.buffer, file.mimetype);
      
      const result = await cloudinary.uploader.upload(fileStr, {
        folder: 'proof_of_payments',
        width: 1200,
        height: 1200,
        crop: 'limit',
        quality: 'auto:good',
        format: 'jpg',
      });

      this.logger.log(`✅ Proof of payment uploaded: ${result.public_id}`);

      return this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          proofOfPayment: result.secure_url,
          manualPaymentMethodId: manualPaymentMethodId,
        },
      });
    } catch (error) {
      this.logger.error('Cloudinary Upload Error (Proof of Payment):', error);
      throw new BadRequestException(`Upload bukti pembayaran gagal: ${error.message}`);
    }
  }
}