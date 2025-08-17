// file: vespa-ecommerce-api/src/payments/payments.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MidtransService } from 'src/midtrans/midtrans.service';
import { PaymentStatus, OrderStatus, Order, User, Prisma } from '@prisma/client';
import { ShipmentsService } from 'src/shipments/shipments.service';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private midtransService: MidtransService,
    private shipmentsService: ShipmentsService,
  ) {}

  async createPaymentForOrder(
    order: Order & { items: any[] },
    user: User,
    shippingCost: number,
    prismaClient: Prisma.TransactionClient = this.prisma,
  ) {
    const totalAmount = order.totalAmount + shippingCost;
    // Panggil Midtrans untuk membuat transaksi
    const midtransTransaction = await this.midtransService.createSnapTransaction(order, user, shippingCost);

    // Simpan semua informasi penting ke database
    await prismaClient.payment.create({
      data: {
        order: { connect: { id: order.id } },
        amount: totalAmount,
        method: 'MIDTRANS_SNAP',
        status: PaymentStatus.PENDING,
        transactionId: midtransTransaction.token, // Simpan token-nya
        redirectUrl: midtransTransaction.redirect_url, // <-- SIMPAN URL PEMBAYARAN DI SINI
      },
    });
    
    // Kembalikan redirect_url agar frontend bisa langsung mengarahkan pengguna
    return { redirect_url: midtransTransaction.redirect_url };
  }

  async handleMidtransCallback(payload: any) {
    const orderId = payload.order_id;
    const transactionStatus = payload.transaction_status;
    
    let paymentStatus: PaymentStatus;
    let orderStatus: OrderStatus;
    
    if (transactionStatus == 'capture' || transactionStatus == 'settlement') {
        paymentStatus = PaymentStatus.SUCCESS;
        orderStatus = OrderStatus.PROCESSING; // Otomatis ke "Processing"
    } else if (transactionStatus == 'pending') {
        paymentStatus = PaymentStatus.PENDING;
        orderStatus = OrderStatus.PENDING;
    } else if (transactionStatus == 'deny' || transactionStatus == 'expire' || transactionStatus == 'cancel') {
        paymentStatus = PaymentStatus.FAILED;
        orderStatus = OrderStatus.CANCELLED;
    } else {
        return { message: `Callback untuk order ${orderId} dengan status ${transactionStatus} diabaikan.` };
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.payment.updateMany({
          where: { order: { id: orderId } },
          data: { status: paymentStatus },
        });
        await tx.order.update({
          where: { id: orderId },
          data: { status: orderStatus },
        });
      });

      console.log(`Order ${orderId} status diperbarui secara otomatis ke ${orderStatus}`);
      return { message: 'Callback diterima dan diproses.' };

    } catch (error) {
        console.error(`Gagal memperbarui order ${orderId}:`, error);
        throw new Error('Gagal memproses callback.');
    }
  }
}