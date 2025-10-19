// file: src/midtrans/midtrans.service.ts

import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Order, User, Prisma } from '@prisma/client';
import * as midtransClient from 'midtrans-client';
import * as crypto from 'crypto';
import { PaymentPreference } from 'src/orders/dto/create-order.dto';

type OrderWithItems = Order & {
  items: ({ product: Prisma.ProductGetPayload<{}> } & Prisma.OrderItemGetPayload<{}>)[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number; // Ini adalah totalAmount (termasuk fee jika ada)
};

@Injectable()
export class MidtransService {
  private snap: midtransClient.Snap;
  private readonly logger = new Logger(MidtransService.name);

  private readonly NON_CREDIT_CARD_PAYMENTS = [
    'gopay',
    'shopeepay',
    'bca_va',
    'bni_va',
    'bri_va',
    'echannel',
    'permata_va',
    'indomaret',
    'alfamart',
    'qris',
  ];

  constructor(private configService: ConfigService) {
    this.snap = new midtransClient.Snap({
      isProduction: this.configService.get('MIDTRANS_IS_PRODUCTION') === 'true',
      serverKey: this.configService.getOrThrow<string>('MIDTRANS_SERVER_KEY'),
      clientKey: this.configService.getOrThrow<string>('MIDTRANS_CLIENT_KEY'),
    });
  }

  async createSnapTransaction(
    order: OrderWithItems,
    user: User,
    shippingCost: number, // Diteruskan dari orders.service
    taxAmount: number, // Diteruskan dari orders.service
    paymentPreference: PaymentPreference,
  ) {

    // --- PERBAIKAN LOGIKA KALKULASI ---

    // 1. Siapkan item_details dasar (SEMUA HARUS INTEGER/ROUNDED)
    // Gunakan nilai dari object order atau parameter yang sudah dihitung di orders.service
    const itemDetails = [
      {
        id: 'SUBTOTAL',
        price: Math.round(order.subtotal),
        quantity: 1,
        name: 'Subtotal Belanja',
      },
      {
        id: 'TAX',
        price: Math.round(taxAmount), // Gunakan taxAmount dari parameter/order
        quantity: 1,
        name: 'Pajak',
      },
      {
        id: 'SHIPPING',
        price: Math.round(shippingCost), // Gunakan shippingCost dari parameter
        quantity: 1,
        name: 'Biaya Pengiriman',
      },
    ];

    if (order.discountAmount > 0) {
      itemDetails.push({
        id: 'DISCOUNT',
        price: -Math.round(order.discountAmount), // Harga negatif untuk diskon
        quantity: 1,
        name: 'Diskon',
      });
    }

    // 2. Hitung total dasar (float) SEBELUM fee
    // Ini diperlukan untuk menghitung admin fee 3% secara akurat
    const floatBaseTotal = order.subtotal + taxAmount + shippingCost - order.discountAmount;

    let enabledPayments: string[] | undefined = undefined;

    if (paymentPreference === PaymentPreference.CREDIT_CARD) {
      // 3. Hitung admin fee dari total dasar (float)
      const adminFee = Math.round(floatBaseTotal * 0.03); // Bulatkan HANYA hasil feenya
      
      itemDetails.push({
        id: 'ADMIN_FEE_CC',
        price: adminFee, // Masukkan fee yang sudah dibulatkan
        quantity: 1,
        name: 'Biaya Admin Kartu Kredit (3%)',
      });
      enabledPayments = ['credit_card'];
      this.logger.log(`Order ${order.id}: CC selected. FloatBaseTotal: ${floatBaseTotal}, Fee: ${adminFee}.`);

    } else if (paymentPreference === PaymentPreference.OTHER) {
      enabledPayments = this.NON_CREDIT_CARD_PAYMENTS;
      this.logger.log(`Order ${order.id}: Other methods selected.`);
    }

    // 4. Hitung finalGrossAmount HANYA DARI PENJUMLAHAN item_details
    // Ini adalah jaminan bahwa totalnya akan selalu sama.
    const finalGrossAmount = itemDetails.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    // ------------------------------------

    const parameter: midtransClient.SnapTransaction = {
      transaction_details: {
        order_id: order.id,
        gross_amount: finalGrossAmount, // <-- Sekarang pasti sama
      },
      customer_details: {
        first_name: user.name || 'Pelanggan',
        email: user.email,
      },
      item_details: itemDetails, // <-- Array yang sudah final
      callbacks: {
        finish: `${this.configService.get('FRONTEND_URL')}/orders/${order.id}`,
      },
      ...(enabledPayments && { enabled_payments: enabledPayments }),
    };

    try {
      this.logger.log(`Creating Midtrans transaction for Order ID: ${order.id} with amount: ${finalGrossAmount}`);
      const transaction = await this.snap.createTransaction(parameter);
      this.logger.log(`Midtrans transaction created successfully for Order ID: ${order.id}. Token: ${transaction.token}`);
      return transaction;
    } catch (error) {
      // Log error yang lebih detail
      this.logger.error(`Midtrans Snap Creation Error for Order ID: ${order.id}:`, error.ApiResponse || error.message, error.stack);
      
      // Lemparkan error yang akan ditangkap oleh orders.service (untuk rollback)
      throw new InternalServerErrorException('Gagal membuat transaksi pembayaran Midtrans.');
    }
  }

  async isValidSignature(payload: any, signatureKey: string): Promise<boolean> {
      const hash = crypto.createHash('sha512');
      const stringToHash = payload.order_id + payload.status_code + payload.gross_amount + this.snap.apiConfig.serverKey;
      hash.update(stringToHash);
      const calculatedSignature = hash.digest('hex');
      return signatureKey === calculatedSignature;
  }
}