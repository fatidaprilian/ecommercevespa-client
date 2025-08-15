// file: vespa-ecommerce-api/src/xendit/xendit.service.ts

import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Order, User } from '@prisma/client';
import axios from 'axios';

@Injectable()
export class XenditService {
  private readonly xenditApiKey: string;
  private readonly xenditWebhookToken: string;
  private readonly xenditApiUrl = 'https://api.xendit.co';

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('XENDIT_API_KEY');
    const webhookToken = this.configService.get<string>('XENDIT_WEBHOOK_TOKEN');
    if (!apiKey || !webhookToken) {
      throw new InternalServerErrorException('Xendit API Key atau Webhook Token tidak diatur di .env');
    }
    this.xenditApiKey = apiKey;
    this.xenditWebhookToken = webhookToken;
  }

  async createInvoice(order: Order, user: User, shippingCost: number) {
    const totalAmount = order.totalAmount + shippingCost;
    const encodedKey = Buffer.from(`${this.xenditApiKey}:`).toString('base64');

    const payload = {
      external_id: order.id,
      amount: totalAmount,
      payer_email: user.email,
      description: `Pembayaran untuk Pesanan #${order.orderNumber}`,
      success_redirect_url: `${this.configService.get('FRONTEND_URL')}/orders/${order.id}`,
      failure_redirect_url: `${this.configService.get('FRONTEND_URL')}/cart`,
    };

    try {
      const response = await axios.post(`${this.xenditApiUrl}/v2/invoices`, payload, {
        headers: {
          Authorization: `Basic ${encodedKey}`,
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Xendit Invoice Creation Error:', error.response?.data || error.message);
      throw new InternalServerErrorException('Gagal membuat invoice pembayaran.');
    }
  }

  /**
   * Memvalidasi token callback yang masuk dari header Xendit.
   */
  validateCallbackToken(tokenFromHeader: string | undefined): void {
    if (tokenFromHeader !== this.xenditWebhookToken) {
      // Lempar error jika token tidak cocok.
      throw new UnauthorizedException('Token webhook tidak valid.');
    }
  }
}