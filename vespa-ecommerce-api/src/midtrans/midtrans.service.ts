// file: src/midtrans/midtrans.service.ts

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Order, User } from '@prisma/client';
import * as midtransClient from 'midtrans-client';
import * as crypto from 'crypto';

// Update type to include necessary fields from the Order object
type OrderWithItems = Order & {
  items: { product: { name: string }; price: number; quantity: number; productId: string }[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
};

@Injectable()
export class MidtransService {
  private snap: midtransClient.Snap;

  constructor(private configService: ConfigService) {
    this.snap = new midtransClient.Snap({
      isProduction: this.configService.get('MIDTRANS_IS_PRODUCTION') === 'true',
      serverKey: this.configService.getOrThrow<string>('MIDTRANS_SERVER_KEY'),
      clientKey: this.configService.getOrThrow<string>('MIDTRANS_CLIENT_KEY'),
    });
  }

  async createSnapTransaction(order: OrderWithItems, user: User, shippingCost: number, taxAmount: number) {
    
    // --- AWAL PERBAIKAN ---
    // HAPUS perhitungan ulang. Gunakan `order.totalAmount` yang sudah final.
    const finalGrossAmount = Math.round(order.totalAmount);

    // Buat item_details yang lebih akurat
    const itemDetails = [
      // Subtotal (harga asli semua barang)
      {
        id: 'SUBTOTAL',
        price: Math.round(order.subtotal),
        quantity: 1,
        name: 'Subtotal Belanja',
      },
      // Pajak
      {
        id: 'TAX',
        price: Math.round(order.taxAmount),
        quantity: 1,
        name: 'Pajak',
      },
      // Biaya Pengiriman
      {
        id: 'SHIPPING',
        price: Math.round(order.shippingCost),
        quantity: 1,
        name: 'Biaya Pengiriman',
      },
    ];

    // Jika ada diskon, tambahkan sebagai item dengan nilai negatif
    if (order.discountAmount > 0) {
      itemDetails.push({
        id: 'DISCOUNT',
        price: -Math.round(order.discountAmount), // Nilai negatif
        quantity: 1,
        name: 'Diskon',
      });
    }
    // --- AKHIR PERBAIKAN ---

    const parameter = {
      transaction_details: {
        order_id: order.id,
        gross_amount: finalGrossAmount, // Gunakan total final
      },
      customer_details: {
        first_name: user.name || 'Pelanggan',
        email: user.email,
      },
      // Ganti item_details dengan yang lebih akurat
      item_details: itemDetails,
      callbacks: {
        finish: `${this.configService.get('FRONTEND_URL')}/orders/${order.id}`,
      },
    };

    try {
      const transaction = await this.snap.createTransaction(parameter);
      return transaction;
    } catch (error) {
      console.error('Midtrans Snap Creation Error:', error.ApiResponse || error);
      throw new InternalServerErrorException('Gagal membuat transaksi pembayaran Midtrans.');
    }
  }

  async isValidSignature(payload: any, signatureKey: string): Promise<boolean> {
      const hash = crypto.createHash('sha512');
      hash.update(payload.order_id + payload.status_code + payload.gross_amount + this.snap.apiConfig.serverKey);
      const calculatedSignature = hash.digest('hex');
      return signatureKey === calculatedSignature;
  }
}