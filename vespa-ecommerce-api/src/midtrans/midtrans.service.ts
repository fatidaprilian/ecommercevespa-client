// file: src/midtrans/midtrans.service.ts

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Order, User } from '@prisma/client';
import * as midtransClient from 'midtrans-client';
import * as crypto from 'crypto';

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

  async createSnapTransaction(order: OrderWithItems, user: User, shippingCost: number, taxAmount: number) {
    const totalAmount = Math.round(order.totalAmount + taxAmount + shippingCost);

    const parameter = {
      transaction_details: {
        order_id: order.id,
        gross_amount: totalAmount,
      },
      customer_details: {
        first_name: user.name || 'Pelanggan',
        email: user.email,
      },
      item_details: [
        ...order.items.map((item) => ({
            id: item.productId,
            price: Math.round(item.price),
            quantity: item.quantity,
            name: item.product.name.substring(0, 50),
        })),
        {
            id: 'SHIPPING_COST',
            price: Math.round(shippingCost),
            quantity: 1,
            name: 'Biaya Pengiriman',
        },
        {
            id: 'TAX',
            price: taxAmount,
            quantity: 1,
            name: 'Pajak (11%)',
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