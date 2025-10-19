// file: vespa-ecommerce-api/src/payments/payments.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MidtransService } from 'src/midtrans/midtrans.service';
import { PaymentStatus, OrderStatus, Order, User, Prisma } from '@prisma/client';
import { ShipmentsService } from 'src/shipments/shipments.service';
import { AccurateSyncService } from 'src/accurate-sync/accurate-sync.service';
import { PaymentPreference } from 'src/orders/dto/create-order.dto';

// Definisikan tipe OrderWithItems yang lebih lengkap
type OrderWithItems = Order & {
  items: ({ product: Prisma.ProductGetPayload<{}> } & Prisma.OrderItemGetPayload<{}>)[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
};


@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private midtransService: MidtransService,
    private shipmentsService: ShipmentsService,
    private accurateSyncService: AccurateSyncService,
  ) {}

  async createPaymentForOrder(
    order: OrderWithItems,
    user: User,
    shippingCost: number,
    paymentPreference: PaymentPreference,
    prismaClient: Prisma.TransactionClient = this.prisma,
  ) {
    const finalAmount = order.totalAmount;

    const midtransTransaction = await this.midtransService.createSnapTransaction(
        order,
        user,
        shippingCost,
        order.taxAmount,
        paymentPreference,
    );

    await prismaClient.payment.create({
      data: {
        order: { connect: { id: order.id } },
        amount: finalAmount,
        method: 'MIDTRANS_SNAP',
        status: PaymentStatus.PENDING,
        transactionId: midtransTransaction.token,
        redirectUrl: midtransTransaction.redirect_url,
      },
    });

    return { redirect_url: midtransTransaction.redirect_url };
  }

  async handleMidtransCallback(payload: any) {
    const orderId = payload.order_id;
    const transactionStatus = payload.transaction_status;

    // --- PERBAIKAN 1: Include payment saat fetch currentOrder ---
    const currentOrder = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
            payment: true, // Sertakan relasi payment
        },
    });
    // ---------------------------------------------------------

    if (!currentOrder) {
        this.logger.warn(`Webhook received for non-existent order ID: ${orderId}`);
        return { message: `Order with ID ${orderId} not found.` };
    }

    let paymentStatus: PaymentStatus;
    let orderStatus: OrderStatus;

    // --- Logika penentuan status (tetap sama) ---
    if (transactionStatus == 'capture' || transactionStatus == 'settlement') {
        paymentStatus = PaymentStatus.SUCCESS;
        orderStatus = (currentOrder.status === OrderStatus.PENDING || currentOrder.status === OrderStatus.PAID)
                      ? OrderStatus.PROCESSING
                      : currentOrder.status;

        let paymentKey = payload.payment_type;
        if (payload.payment_type === 'bank_transfer' && payload.va_numbers?.length > 0) {
            const bank = payload.va_numbers[0].bank;
            paymentKey = `${bank}_va`;
        } else if (payload.payment_type === 'cstore') {
            paymentKey = `cstore_${payload.store}`;
        } else if (payload.payment_type === 'qris') {
            paymentKey = 'qris';
        } else if (payload.payment_type === 'credit_card') {
            paymentKey = 'credit_card';
        }

        const mapping = await this.prisma.paymentMethodMapping.findUnique({
            where: { paymentMethodKey: paymentKey },
        });

        if (!mapping || !mapping.accurateBankNo) {
            this.logger.error(`Payment mapping for Midtrans key "${paymentKey}" not found or accurateBankNo is missing. Cannot sync order ${orderId} to Accurate.`);
        } else {
             if (!currentOrder.accurateSalesInvoiceNumber && orderStatus === OrderStatus.PROCESSING) {
                 this.accurateSyncService.createSalesInvoiceAndReceipt(orderId, mapping.accurateBankNo, mapping.accurateBankName)
                    .catch(err => {
                        this.logger.error(`Failed to create Accurate documents for order ${orderId}`, err.stack);
                    });
             }
        }

    } else if (transactionStatus == 'pending') {
        paymentStatus = PaymentStatus.PENDING;
        orderStatus = currentOrder.status === OrderStatus.PENDING ? OrderStatus.PENDING : currentOrder.status;
    } else if (transactionStatus == 'deny' || transactionStatus == 'expire' || transactionStatus == 'cancel') {
        paymentStatus = PaymentStatus.FAILED;
        orderStatus = (currentOrder.status === OrderStatus.PENDING || currentOrder.status === OrderStatus.PAID)
                      ? OrderStatus.CANCELLED
                      : currentOrder.status;
    } else {
        this.logger.log(`Callback untuk pesanan ${orderId} dengan status ${transactionStatus} diabaikan.`);
        return { message: `Callback for order ${orderId} with status ${transactionStatus} ignored.` };
    }

    // --- Logika pencegahan downgrade status (tetap sama) ---
    if (currentOrder.status !== OrderStatus.PENDING && orderStatus === OrderStatus.PENDING) {
        this.logger.log(`Mengabaikan notifikasi 'pending' untuk pesanan ${orderId} karena status saat ini adalah '${currentOrder.status}'.`);
        return { message: 'Status update ignored to prevent downgrade.' };
    }

    // --- Logika jika status tidak berubah (tetap sama, Error TS2339 sudah diperbaiki dengan include payment di atas) ---
    if (currentOrder.status === orderStatus) {
         this.logger.log(`Status order ${orderId} sudah ${orderStatus}. Tidak ada update.`);
         // --- PERBAIKAN 1 disini juga berlaku, currentOrder.payment sekarang ada ---
         if (currentOrder.payment?.status !== paymentStatus) {
             await this.prisma.payment.updateMany({
                 where: { orderId: orderId },
                 data: { status: paymentStatus }
             });
             this.logger.log(`Status payment untuk order ${orderId} diupdate menjadi ${paymentStatus}.`);
         }
         return { message: 'Order status already up-to-date.' };
    }


    try {
      // --- PERBAIKAN 2: Hanya masukkan operasi Prisma ke $transaction ---
      const operations: Prisma.PrismaPromise<any>[] = []; // Buat array kosong

      // Tambahkan update payment jika ada dan statusnya berbeda
      if (currentOrder.payment && currentOrder.payment.status !== paymentStatus) {
          operations.push(
              this.prisma.payment.updateMany({
                  where: { orderId: orderId },
                  data: { status: paymentStatus },
              })
          );
      }

      // Tambahkan update order jika statusnya berbeda (sudah dicek di atas)
      if (currentOrder.status !== orderStatus) {
           operations.push(
              this.prisma.order.update({
                  where: { id: orderId },
                  data: { status: orderStatus },
              })
           );
      }

      // Jalankan transaksi hanya jika ada operasi yang perlu dilakukan
      if (operations.length > 0) {
          await this.prisma.$transaction(operations);
          this.logger.log(`Status pesanan ${orderId} berhasil diproses. Status akhir: ${orderStatus}, Status Payment: ${paymentStatus}`);
      } else {
          this.logger.log(`Tidak ada perubahan status yang diperlukan untuk order ${orderId}.`);
      }
      // ---------------------------------------------------------------------

      return { message: 'Callback received and processed.' };

    } catch (error) {
        this.logger.error(`Gagal memperbarui pesanan ${orderId}:`, error);
        return { message: 'Failed to process callback internally.' };
    }
  }
}