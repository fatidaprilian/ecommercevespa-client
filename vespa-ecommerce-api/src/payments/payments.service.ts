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
import { MidtransService } from 'src/midtrans/midtrans.service'; // Pastikan import ini benar
import {
  PaymentStatus,
  OrderStatus,
  Order,
  User,
  Prisma,
  Role,
} from '@prisma/client'; // Import Role
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

    // --- REVISI: Kirim ID unik bahkan saat pembuatan pertama ---
    // Ini memastikan callback handler selalu bisa bekerja
    const midtransOrderId = `${order.id}-${Date.now()}`;
    this.logger.log(`Creating first payment for ${order.id} with Midtrans ID: ${midtransOrderId}`);

    const midtransTransaction = await this.midtransService.createSnapTransaction(
      // Kirim order dengan ID yang sudah dimodifikasi
      { ...order, id: midtransOrderId },
      user,
      shippingCost,
      order.taxAmount,
      paymentPreference,
    );

    await prismaClient.payment.create({
      data: {
        order: { connect: { id: order.id } }, // Tetap terhubung ke order.id asli
        amount: finalAmount, // Simpan total akhir (termasuk fee jika ada)
        method: 'MIDTRANS_SNAP',
        status: PaymentStatus.PENDING,
        // Simpan midtransOrderId jika perlu dilacak,
        // tapi transactionId (token) lebih penting untuk Snap
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
      throw new UnprocessableEntityException(
        `Pesanan ini tidak lagi menunggu pembayaran (Status: ${order.status}).`,
      );
    }
    if (!order.payment) {
      throw new InternalServerErrorException(
        `Data pembayaran untuk order ${orderId} tidak ditemukan.`,
      );
    }
    // -------------

    // --- ============ REVISI LOGIKA PEMBATALAN ============ ---
    // --- HAPUS BLOK 'try/catch' 'cancelTransaction' ---
    // Kita tidak perlu lagi membatalkan transaksi lama,
    // karena kita akan membuat yang baru dengan ID unik.
    this.logger.log(
      `Retry payment for Order ID: ${order.id}. Skipping cancel, generating new Midtrans ID.`,
    );
    // --- ============ AKHIR REVISI ============ ---

    // Tentukan preferensi: gunakan yang baru jika ada, atau fallback ke OTHER jika tidak ada info sebelumnya
    let finalPaymentPreference =
      retryPaymentDto.paymentPreference || PaymentPreference.OTHER;

    // --- Logika Kalkulasi Ulang Total (PENTING untuk potensi perubahan admin fee) ---
    const vatPercentage = await this.settingsService.getVatPercentage();
    const taxableAmount = order.subtotal - order.discountAmount;
    const taxAmount = (taxableAmount * vatPercentage) / 100;
    const baseTotalAmount = taxableAmount + taxAmount + order.shippingCost;

    let grossAmountForMidtrans = baseTotalAmount; // Defaultnya adalah total dasar
    if (finalPaymentPreference === PaymentPreference.CREDIT_CARD) {
      const adminFee = baseTotalAmount * 0.03; // Hitung 3% dari total dasar
      grossAmountForMidtrans = baseTotalAmount + adminFee; // Total akhir termasuk fee
      this.logger.log(
        `Retry payment: Admin fee CC ${adminFee} applied for order ${orderId}. Gross amount: ${grossAmountForMidtrans}`,
      );
    } else {
      this.logger.log(
        `Retry payment: No admin fee for order ${orderId}. Gross amount: ${grossAmountForMidtrans}`,
      );
    }
    // Pastikan grossAmountForMidtrans selalu positif dan dibulatkan ke integer terdekat jika perlu (sesuaikan dengan logika MidtransService)
    grossAmountForMidtrans = Math.max(0, Math.round(grossAmountForMidtrans));

    // --- Panggil Midtrans ---
    // --- REVISI: Buat ID unik baru untuk Midtrans ---
    const newMidtransOrderId = `${order.id}-${Date.now()}`;
    this.logger.log(`Creating retry transaction for ${order.id} with Midtrans ID: ${newMidtransOrderId}`);

    const midtransTransaction = await this.midtransService.createSnapTransaction(
      // Kirim order dengan ID yang sudah dimodifikasi (newMidtransOrderId)
      { ...order, id: newMidtransOrderId, totalAmount: grossAmountForMidtrans },
      order.user,
      order.shippingCost,
      order.taxAmount,
      finalPaymentPreference, // Preferensi baru atau hasil fallback
    );
    // ----------------------

    // --- Update Payment Record ---
    // Kita update record payment yang *sudah ada* dengan token & URL baru
    await prismaClient.payment.update({
      where: { id: order.payment.id },
      data: {
        amount: grossAmountForMidtrans, // Update amount jika berubah (karena admin fee)
        transactionId: midtransTransaction.token, // Token baru dari Midtrans
        redirectUrl: midtransTransaction.redirect_url, // URL baru
        status: PaymentStatus.PENDING, // Reset status jadi PENDING lagi
        method: 'MIDTRANS_SNAP', // Pastikan methodnya SNAP
      },
    });
    // --------------------------

    this.logger.log(
      `Retry payment initiated for Order ID: ${orderId}. New Midtrans Token: ${midtransTransaction.token}`,
    );
    return { redirect_url: midtransTransaction.redirect_url };
  }
  // --- AKHIR METHOD BARU ---

  async handleMidtransCallback(payload: any) {
    // --- REVISI: Parsing 'order_id' dari Midtrans ---
    const midtransOrderId = payload.order_id;
    if (!midtransOrderId || typeof midtransOrderId !== 'string') {
        this.logger.error('Callback received with missing or invalid order_id.', payload);
        return { message: 'Invalid order_id in callback.' };
    }

    // Ambil ID order database asli (bagian sebelum tanda hubung '-')
    const dbOrderId = midtransOrderId.split('-')[0];
    
    const transactionStatus = payload.transaction_status;
    const fraudStatus = payload.fraud_status; // Tambahkan fraud_status

    this.logger.log(
      `Received Midtrans callback for Midtrans ID: ${midtransOrderId} (DB Order ID: ${dbOrderId}), Status: ${transactionStatus}, Fraud: ${fraudStatus}`,
    );

    // Validasi signature key sebelum proses lebih lanjut
    const signatureKey = payload.signature_key;
    const isValid = await this.midtransService.isValidSignature(
      payload,
      signatureKey,
    );
    if (!isValid) {
      this.logger.error(
        `Invalid signature key for Midtrans ID: ${midtransOrderId}. Callback ignored.`,
      );
      return { message: 'Invalid signature.' };
    }
    this.logger.log(
      `Signature key validated successfully for Midtrans ID: ${midtransOrderId}.`,
    );

    // --- REVISI: Gunakan 'dbOrderId' untuk mencari order ---
    const currentOrder = await this.prisma.order.findUnique({
      where: { id: dbOrderId }, 
      include: {
        payment: true,
      },
    });

    if (!currentOrder) {
      this.logger.warn(
        `Webhook received for non-existent DB order ID: ${dbOrderId} (from Midtrans ID: ${midtransOrderId})`,
      );
      return { message: `Order with ID ${dbOrderId} not found.` };
    }

    // Ganti semua referensi 'orderId' (yang tadinya payload.order_id)
    // menjadi 'dbOrderId' di sisa fungsi ini.
    
    let paymentStatus: PaymentStatus;
    let orderStatus: OrderStatus;

    // --- Logika Penentuan Status ---
    if (fraudStatus == 'challenge') {
      paymentStatus = PaymentStatus.PENDING; 
      orderStatus = currentOrder.status; 
      this.logger.log(
        `Order ${dbOrderId} flagged as 'challenge' by Midtrans. Status remains PENDING.`,
      );
    } else if (fraudStatus == 'deny') {
      paymentStatus = PaymentStatus.FAILED;
      orderStatus =
        currentOrder.status === OrderStatus.PENDING ||
        currentOrder.status === OrderStatus.PAID
          ? OrderStatus.CANCELLED
          : currentOrder.status;
      this.logger.warn(
        `Order ${dbOrderId} denied due to fraud status. Order status set to CANCELLED.`,
      );
    } else if (
      transactionStatus == 'capture' ||
      transactionStatus == 'settlement'
    ) {
      paymentStatus = PaymentStatus.SUCCESS;
      orderStatus =
        currentOrder.status === OrderStatus.PENDING ||
        currentOrder.status === OrderStatus.PAID
          ? OrderStatus.PROCESSING
          : currentOrder.status;

      if (orderStatus === OrderStatus.PROCESSING) {
        let paymentKey = payload.payment_type;
        if (
          payload.payment_type === 'bank_transfer' &&
          payload.va_numbers?.length > 0
        ) {
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
          this.logger.error(
            `Payment mapping for Midtrans key "${paymentKey}" not found or accurateBankNo is missing. Cannot sync order ${dbOrderId} to Accurate.`,
          );
        } else {
          if (!currentOrder.accurateSalesInvoiceNumber) {
            this.logger.log(
              `Triggering Accurate sync (Invoice & Receipt) for Order ID: ${dbOrderId}`,
            );
            this.accurateSyncService
              .createSalesInvoiceAndReceipt(
                dbOrderId, // --- REVISI: Gunakan dbOrderId
                mapping.accurateBankNo,
                mapping.accurateBankName,
              )
              .catch((err) => {
                this.logger.error(
                  `Failed to trigger Accurate sync for order ${dbOrderId} (background)`,
                  err.stack,
                );
              });
          } else {
            this.logger.log(
              `Accurate sync skipped for Order ID: ${dbOrderId} as an invoice number already exists.`,
            );
          }
        }
      }
    } else if (transactionStatus == 'pending') {
      paymentStatus = PaymentStatus.PENDING;
      orderStatus =
        currentOrder.status === OrderStatus.PENDING
          ? OrderStatus.PENDING
          : currentOrder.status;
    } else if (
      transactionStatus == 'deny' ||
      transactionStatus == 'expire' ||
      transactionStatus == 'cancel'
    ) {
      paymentStatus = PaymentStatus.FAILED;
      orderStatus =
        currentOrder.status === OrderStatus.PENDING ||
        currentOrder.status === OrderStatus.PAID
          ? OrderStatus.CANCELLED
          : currentOrder.status;
    } else {
      this.logger.log(
        `Callback untuk pesanan ${dbOrderId} dengan status ${transactionStatus} diabaikan.`,
      );
      return {
        message: `Callback for order ${dbOrderId} with status ${transactionStatus} ignored.`,
      };
    }

    // --- Logika Pencegahan Downgrade Status ---
    if (
      currentOrder.status !== OrderStatus.PENDING &&
      orderStatus === OrderStatus.PENDING
    ) {
      this.logger.log(
        `Mengabaikan notifikasi 'pending' untuk pesanan ${dbOrderId} karena status saat ini adalah '${currentOrder.status}'.`,
      );
      return { message: 'Status update ignored to prevent downgrade.' };
    }

    // --- Logika Jika Status Tidak Berubah ---
    if (
      currentOrder.status === orderStatus &&
      currentOrder.payment?.status === paymentStatus
    ) {
      this.logger.log(
        `Status order ${dbOrderId} (${orderStatus}) dan payment (${paymentStatus}) sudah sesuai. Tidak ada update.`,
      );
      return { message: 'Order and payment status already up-to-date.' };
    }

    // --- Update Database ---
    try {
      const operations: Prisma.PrismaPromise<any>[] = [];

      // Update payment JIKA status payment berubah
      if (currentOrder.payment && currentOrder.payment.status !== paymentStatus) {
        operations.push(
          this.prisma.payment.updateMany({
            where: { orderId: dbOrderId }, // --- REVISI: Gunakan dbOrderId
            data: { status: paymentStatus },
          }),
        );
      }

      // Update order JIKA status order berubah
      if (currentOrder.status !== orderStatus) {
        operations.push(
          this.prisma.order.update({
            where: { id: dbOrderId }, // --- REVISI: Gunakan dbOrderId
            data: { status: orderStatus },
          }),
        );
        // Jika status menjadi CANCELLED/REFUNDED dari callback, kembalikan stok
        if (
          (orderStatus === OrderStatus.CANCELLED ||
            orderStatus === OrderStatus.REFUNDED) &&
          currentOrder.status !== OrderStatus.CANCELLED &&
          currentOrder.status !== OrderStatus.REFUNDED
        ) {
          const orderItems = await this.prisma.orderItem.findMany({
            where: { orderId: dbOrderId }, // --- REVISI: Gunakan dbOrderId
          });
          const stockUpdateOps = orderItems.map((item) =>
            this.prisma.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            }),
          );
          operations.push(...stockUpdateOps);
          this.logger.log(
            `Stock restored for order ${dbOrderId} due to status change to ${orderStatus}.`,
          );
        }
      }

      if (operations.length > 0) {
        await this.prisma.$transaction(operations);
        this.logger.log(
          `Status pesanan ${dbOrderId} berhasil diproses. Final status - Order: ${orderStatus}, Payment: ${paymentStatus}`,
        );
      } else {
        this.logger.log(
          `Tidak ada perubahan status database yang diperlukan untuk order ${dbOrderId}.`,
        );
      }

      return { message: 'Callback received and processed successfully.' };
    } catch (error) {
      this.logger.error(
        `Gagal memperbarui pesanan ${dbOrderId} dari callback:`,
        error,
      );
      return { message: 'Failed to process callback internally.' }; // Kembalikan OK agar Midtrans tidak retry
    }
  }
}