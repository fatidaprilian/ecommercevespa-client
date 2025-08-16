// file: src/midtrans/midtrans.service.ts

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Order, User } from '@prisma/client';
import * as midtransClient from 'midtrans-client';
import * as crypto from 'crypto';

// Definisikan tipe Order yang menyertakan relasi 'items'
type OrderWithItems = Order & {
  items: { product: { name: string }; price: number; quantity: number; productId: string }[];
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

  async createSnapTransaction(order: OrderWithItems, user: User, shippingCost: number) {
    // --- PERBAIKAN DI SINI: Bulatkan semua nilai harga ---
    const totalAmount = Math.round(order.totalAmount + shippingCost);

    const parameter = {
      transaction_details: {
        order_id: order.id,
        gross_amount: totalAmount, // Gunakan total yang sudah dibulatkan
      },
      customer_details: {
        first_name: user.name || 'Pelanggan',
        email: user.email,
      },
      item_details: [
        ...order.items.map((item) => ({
            id: item.productId,
            price: Math.round(item.price), // Bulatkan harga per item
            quantity: item.quantity,
            name: item.product.name.substring(0, 50),
        })),
        {
            id: 'SHIPPING_COST',
            price: Math.round(shippingCost), // Bulatkan ongkos kirim
            quantity: 1,
            name: 'Biaya Pengiriman',
        }
      ],
      callbacks: {
        finish: `${this.configService.get('FRONTEND_URL')}/orders/${order.id}`,
      },
    };

    try {
      const transaction = await this.snap.createTransaction(parameter);
      return transaction;
    } catch (error) {
      console.error('Midtrans Snap Creation Error:', error);
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