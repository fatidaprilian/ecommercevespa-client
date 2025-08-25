// file: src/midtrans/midtrans.service.ts

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Order, User } from '@prisma/client';
import * as midtransClient from 'midtrans-client';
import * as crypto from 'crypto';

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
    
    const finalGrossAmount = Math.round(order.totalAmount);

    const itemDetails = [
      {
        id: 'SUBTOTAL',
        price: Math.round(order.subtotal),
        quantity: 1,
        name: 'Subtotal Belanja',
      },
      {
        id: 'TAX',
        price: Math.round(order.taxAmount),
        quantity: 1,
        name: 'Pajak',
      },
      {
        id: 'SHIPPING',
        price: Math.round(order.shippingCost),
        quantity: 1,
        name: 'Biaya Pengiriman',
      },
    ];

    if (order.discountAmount > 0) {
      itemDetails.push({
        id: 'DISCOUNT',
        price: -Math.round(order.discountAmount),
        quantity: 1,
        name: 'Diskon',
      });
    }

    const parameter = {
      transaction_details: {
        order_id: order.id,
        gross_amount: finalGrossAmount,
      },
      customer_details: {
        first_name: user.name || 'Pelanggan',
        email: user.email,
      },
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