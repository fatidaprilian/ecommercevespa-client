// file: vespa-ecommerce-api/src/payments/payments.service.ts

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  UnprocessableEntityException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MidtransService } from 'src/midtrans/midtrans.service';
import { PaymentStatus, OrderStatus, Order, User, Prisma, Role } from '@prisma/client'; // Import Role
import { ShipmentsService } from 'src/shipments/shipments.service';
import { AccurateSyncService } from 'src/accurate-sync/accurate-sync.service';
import { PaymentPreference } from 'src/orders/dto/create-order.dto';
import { SettingsService } from 'src/settings/settings.service'; // <-- Impor SettingsService
import { RetryPaymentDto } from './dto/retry-payment.dto'; // <-- Impor DTO baru

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
    private settingsService: SettingsService, // <-- Inject SettingsService
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
        amount: finalAmount, // Simpan total akhir (termasuk fee jika ada)
        method: 'MIDTRANS_SNAP',
        status: PaymentStatus.PENDING,
        transactionId: midtransTransaction.token, // Ini adalah Midtrans Snap Token
        redirectUrl: midtransTransaction.redirect_url, // Ini adalah URL redirect Midtrans
      },
    });

    return { redirect_url: midtransTransaction.redirect_url };
  }

  // --- METHOD BARU UNTUK RETRY PAYMENT ---
  async retryPaymentForOrder(
    orderId: string,
    userId: string, // Tambahkan userId untuk verifikasi kepemilikan
    retryPaymentDto: RetryPaymentDto, // Gunakan DTO baru
    prismaClient: Prisma.TransactionClient = this.prisma, // Tetap gunakan prismaClient
  ) {
      const order = await prismaClient.order.findUnique({
          where: { id: orderId },
          include: {
              user: true, // Include user untuk cek role dan ID
              items: { include: { product: true } },
              payment: true, // Include payment yang sudah ada
          },
      });

      // --- Validasi ---
      if (!order) {
          throw new NotFoundException(`Order ${orderId} tidak ditemukan.`);
      }
      if (order.userId !== userId) {
          throw new ForbiddenException('Anda tidak memiliki akses ke pesanan ini.');
      }
      if (order.user.role !== Role.MEMBER) {
           throw new ForbiddenException('Fitur ini hanya untuk Member.');
      }
      if (order.status !== OrderStatus.PENDING) {
          throw new UnprocessableEntityException(`Pesanan ini tidak lagi menunggu pembayaran (Status: ${order.status}).`);
      }
      if (!order.payment) {
           throw new InternalServerErrorException(`Data pembayaran untuk order ${orderId} tidak ditemukan.`);
      }
      // -------------

      // Tentukan preferensi: gunakan yang baru jika ada, atau fallback ke OTHER jika tidak ada info sebelumnya
      let finalPaymentPreference = retryPaymentDto.paymentPreference || PaymentPreference.OTHER;

      // --- Logika Kalkulasi Ulang Total (PENTING untuk potensi perubahan admin fee) ---
      const vatPercentage = await this.settingsService.getVatPercentage();
      const taxableAmount = order.subtotal - order.discountAmount;
      const taxAmount = (taxableAmount * vatPercentage) / 100;
      const baseTotalAmount = taxableAmount + taxAmount + order.shippingCost;

      let grossAmountForMidtrans = baseTotalAmount; // Defaultnya adalah total dasar
      if (finalPaymentPreference === PaymentPreference.CREDIT_CARD) {
          const adminFee = baseTotalAmount * 0.03; // Hitung 3% dari total dasar
          grossAmountForMidtrans = baseTotalAmount + adminFee; // Total akhir termasuk fee
          this.logger.log(`Retry payment: Admin fee CC ${adminFee} applied for order ${orderId}. Gross amount: ${grossAmountForMidtrans}`);
      } else {
          this.logger.log(`Retry payment: No admin fee for order ${orderId}. Gross amount: ${grossAmountForMidtrans}`);
      }
      // Pastikan grossAmountForMidtrans selalu positif dan dibulatkan ke integer terdekat jika perlu (sesuaikan dengan logika MidtransService)
      grossAmountForMidtrans = Math.max(0, Math.round(grossAmountForMidtrans));


      // --- Panggil Midtrans ---
      const midtransTransaction = await this.midtransService.createSnapTransaction(
          {...order, totalAmount: grossAmountForMidtrans}, // Kirim order dengan gross amount yang sudah disesuaikan
          order.user,
          order.shippingCost,
          order.taxAmount,
          finalPaymentPreference, // Preferensi baru atau hasil fallback
      );
      // ----------------------

      // --- Update Payment Record ---
      await prismaClient.payment.update({
          where: { id: order.payment.id },
          data: {
              amount: grossAmountForMidtrans, // Update amount jika berubah (karena admin fee)
              transactionId: midtransTransaction.token, // Token baru dari Midtrans
              redirectUrl: midtransTransaction.redirect_url, // URL baru
              status: PaymentStatus.PENDING, // Reset status jadi PENDING lagi
              method: 'MIDTRANS_SNAP', // Pastikan methodnya SNAP
              // updatedAt: new Date() // Prisma otomatis update ini
          },
      });
      // --------------------------

      this.logger.log(`Retry payment initiated for Order ID: ${orderId}. New Midtrans Token: ${midtransTransaction.token}`);
      return { redirect_url: midtransTransaction.redirect_url };
  }
  // --- AKHIR METHOD BARU ---


  async handleMidtransCallback(payload: any) {
    const orderId = payload.order_id;
    const transactionStatus = payload.transaction_status;
    const fraudStatus = payload.fraud_status; // Tambahkan fraud_status

    this.logger.log(`Received Midtrans callback for Order ID: ${orderId}, Status: ${transactionStatus}, Fraud: ${fraudStatus}`);

    // Validasi signature key sebelum proses lebih lanjut
    const signatureKey = payload.signature_key;
    const isValid = await this.midtransService.isValidSignature(payload, signatureKey);
    if (!isValid) {
        this.logger.error(`Invalid signature key for Order ID: ${orderId}. Callback ignored.`);
        // Beri respons error ke Midtrans agar mereka tahu ada masalah
        // throw new ForbiddenException('Invalid signature key.');
        // Cukup log error dan return OK agar Midtrans tidak retry terus menerus
         return { message: 'Invalid signature.' };
    }
    this.logger.log(`Signature key validated successfully for Order ID: ${orderId}.`);


    const currentOrder = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
            payment: true,
        },
    });

    if (!currentOrder) {
        this.logger.warn(`Webhook received for non-existent order ID: ${orderId}`);
        return { message: `Order with ID ${orderId} not found.` };
    }

    let paymentStatus: PaymentStatus;
    let orderStatus: OrderStatus;

    // --- Logika Penentuan Status ---
    // Handle fraud status 'challenge' atau 'deny'
    if (fraudStatus == 'challenge') {
        paymentStatus = PaymentStatus.PENDING; // Tetap pending menunggu review manual
        orderStatus = currentOrder.status; // Jangan ubah status order
        this.logger.log(`Order ${orderId} flagged as 'challenge' by Midtrans. Status remains PENDING.`);
    } else if (fraudStatus == 'deny') {
        paymentStatus = PaymentStatus.FAILED;
        orderStatus = (currentOrder.status === OrderStatus.PENDING || currentOrder.status === OrderStatus.PAID)
                      ? OrderStatus.CANCELLED // Batalkan order jika fraud ditolak
                      : currentOrder.status;
        this.logger.warn(`Order ${orderId} denied due to fraud status. Order status set to CANCELLED.`);
    }
    // Handle transaction status jika fraud aman ('accept') atau tidak ada
    else if (transactionStatus == 'capture' || transactionStatus == 'settlement') {
        paymentStatus = PaymentStatus.SUCCESS;
        orderStatus = (currentOrder.status === OrderStatus.PENDING || currentOrder.status === OrderStatus.PAID)
                      ? OrderStatus.PROCESSING // Maju ke processing jika belum
                      : currentOrder.status; // Jika sudah processing/shipped, biarkan

        // Sinkronisasi Accurate hanya jika payment success & order jadi PROCESSING
        if (orderStatus === OrderStatus.PROCESSING) {
            let paymentKey = payload.payment_type;
            // ... (logika penentuan paymentKey tetap sama) ...
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
            // ... (logika mapping dan trigger Accurate sync tetap sama) ...
             const mapping = await this.prisma.paymentMethodMapping.findUnique({
                 where: { paymentMethodKey: paymentKey },
             });
             if (!mapping || !mapping.accurateBankNo) {
                 this.logger.error(`Payment mapping for Midtrans key "${paymentKey}" not found or accurateBankNo is missing. Cannot sync order ${orderId} to Accurate.`);
             } else {
                  // Hanya trigger jika belum ada nomor invoice Accurate
                  if (!currentOrder.accurateSalesInvoiceNumber) {
                      this.logger.log(`Triggering Accurate sync (Invoice & Receipt) for Order ID: ${orderId}`);
                      // Jalankan di background (tanpa await)
                      this.accurateSyncService.createSalesInvoiceAndReceipt(orderId, mapping.accurateBankNo, mapping.accurateBankName)
                         .catch(err => {
                             this.logger.error(`Failed to trigger Accurate sync for order ${orderId} (background)`, err.stack);
                         });
                  } else {
                     this.logger.log(`Accurate sync skipped for Order ID: ${orderId} as an invoice number already exists.`);
                  }
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

    // --- Logika Pencegahan Downgrade Status ---
    if (currentOrder.status !== OrderStatus.PENDING && orderStatus === OrderStatus.PENDING) {
        this.logger.log(`Mengabaikan notifikasi 'pending' untuk pesanan ${orderId} karena status saat ini adalah '${currentOrder.status}'.`);
        return { message: 'Status update ignored to prevent downgrade.' };
    }

    // --- Logika Jika Status Tidak Berubah ---
    if (currentOrder.status === orderStatus && currentOrder.payment?.status === paymentStatus) {
         this.logger.log(`Status order ${orderId} (${orderStatus}) dan payment (${paymentStatus}) sudah sesuai. Tidak ada update.`);
         return { message: 'Order and payment status already up-to-date.' };
    }

    // --- Update Database ---
    try {
      const operations: Prisma.PrismaPromise<any>[] = [];

      // Update payment JIKA status payment berubah
      if (currentOrder.payment && currentOrder.payment.status !== paymentStatus) {
          operations.push(
              this.prisma.payment.updateMany({
                  where: { orderId: orderId },
                  data: { status: paymentStatus },
              })
          );
      }

      // Update order JIKA status order berubah
      if (currentOrder.status !== orderStatus) {
           operations.push(
              this.prisma.order.update({
                  where: { id: orderId },
                  data: { status: orderStatus },
              })
           );
           // Jika status menjadi CANCELLED/REFUNDED dari callback, kembalikan stok
           if ((orderStatus === OrderStatus.CANCELLED || orderStatus === OrderStatus.REFUNDED) &&
               (currentOrder.status !== OrderStatus.CANCELLED && currentOrder.status !== OrderStatus.REFUNDED))
           {
               const orderItems = await this.prisma.orderItem.findMany({ where: { orderId } });
               const stockUpdateOps = orderItems.map(item =>
                   this.prisma.product.update({
                       where: { id: item.productId },
                       data: { stock: { increment: item.quantity } }
                   })
               );
               operations.push(...stockUpdateOps);
               this.logger.log(`Stock restored for order ${orderId} due to status change to ${orderStatus}.`);
           }
      }

      if (operations.length > 0) {
          await this.prisma.$transaction(operations);
          this.logger.log(`Status pesanan ${orderId} berhasil diproses. Final status - Order: ${orderStatus}, Payment: ${paymentStatus}`);
      } else {
          this.logger.log(`Tidak ada perubahan status database yang diperlukan untuk order ${orderId}.`);
      }

      return { message: 'Callback received and processed successfully.' };

    } catch (error) {
        this.logger.error(`Gagal memperbarui pesanan ${orderId} dari callback:`, error);
        // Mungkin perlu melempar error agar Midtrans retry, tergantung strategi Anda
        // throw new InternalServerErrorException('Failed to process callback internally.');
        return { message: 'Failed to process callback internally.' }; // Kembalikan OK agar Midtrans tidak retry
    }
  }
}