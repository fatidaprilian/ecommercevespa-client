// src/orders/order-expiration.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule'; // Modul untuk jadwal
import { PrismaService } from 'src/prisma/prisma.service'; // Akses database
import { OrderStatus, Role, PaymentStatus } from '@prisma/client'; // Enum Status & Role
import { subHours } from 'date-fns'; // Fungsi bantu untuk waktu - subMinutes dihapus karena tidak dipakai
import { AccurateSyncService } from 'src/accurate-sync/accurate-sync.service'; // Untuk sinkronisasi stok ke Accurate

@Injectable()
export class OrderExpirationService {
  private readonly logger = new Logger(OrderExpirationService.name);

  constructor(
    private prisma: PrismaService,
    // accurateSyncService masih di-inject, tidak apa-apa walau tidak dipakai di sini
    private accurateSyncService: AccurateSyncService,
  ) {}

  // Menjadwalkan fungsi ini untuk berjalan setiap 30 Menit
  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleExpiredPendingOrders() {
    this.logger.log(
      '⏳ Memulai pemeriksaan pesanan PENDING (Member) yang kedaluwarsa...',
    );

    // Tentukan batas waktu (24 jam yang lalu dari sekarang)
    const expirationThreshold = subHours(new Date(), 24);

    // Cari pesanan MEMBER yang PENDING dan dibuat sebelum batas waktu
    const expiredOrders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING, // Hanya yang PENDING
        createdAt: {
          lt: expirationThreshold, // Dibuat sebelum 24 jam lalu
        },
        user: {
          role: Role.MEMBER, // Hanya untuk MEMBER
        },
        payment: {
          // Pastikan ada record payment (untuk alur Midtrans)
          isNot: null,
        },
      },
      include: {
        // Kita hanya butuh item untuk pengembalian stok LOKAL
        items: {
          include: {
            product: {
              select: {
                id: true,
                // sku: true, // SKU tidak lagi diperlukan di sini
              },
            },
          },
        },
        user: {
          // Ambil info user jika perlu untuk logging
          select: { email: true },
        },
      },
    });

    if (expiredOrders.length === 0) {
      this.logger.log('✅ Tidak ada pesanan Member PENDING yang kedaluwarsa.');
      return; // Tidak ada yang perlu dilakukan
    }

    this.logger.log(
      `🔍 Ditemukan ${expiredOrders.length} pesanan Member PENDING yang kedaluwarsa. Memproses pembatalan...`,
    );

    // Proses pembatalan satu per satu
    for (const order of expiredOrders) {
      this.logger.log(
        `Processing cancellation for Order #${order.orderNumber} (User: ${order.user.email})...`,
      );
      try {
        // List 'itemsToRestockAccurate' tidak lagi diperlukan
        // const itemsToRestockAccurate: { sku: string; quantity: number }[] = [];

        // Lakukan dalam transaksi database lokal
        await this.prisma.$transaction(async (tx) => {
          // 1. Update status pesanan lokal
          await tx.order.update({
            where: { id: order.id },
            data: { status: OrderStatus.CANCELLED },
          });

          // 2. Kembalikan stok produk lokal
          const stockUpdateOperations = order.items.map((item) => {
            // Pengumpulan data untuk Accurate dihapus dari sini

            // Operasi update stok lokal
            return tx.product.update({
              where: { id: item.product.id },
              data: { stock: { increment: item.quantity } }, // Tambah stok
            });
          });
          await Promise.all(stockUpdateOperations); // Jalankan semua update stok lokal

          // 3. Update status payment lokal (opsional tapi bagus)
          await tx.payment.updateMany({
            where: { orderId: order.id },
            data: { status: PaymentStatus.EXPIRED },
          });

          this.logger.log(`Order #${order.orderNumber} cancelled locally. Local stock restored.`);
        }); // Akhir transaksi lokal

        // Member orders in PENDING state do not hold stock in Accurate.
        // Therefore, we only restore local DB stock upon expiration.
        this.logger.log(`Order #${order.orderNumber} (Member) expired. No Accurate restock required.`);
      } catch (error) {
        this.logger.error(`Failed to cancel Order #${order.orderNumber}. Error: ${error.message}`, error.stack);
        // Lanjutkan ke pesanan berikutnya jika ada error
      }
    } // Akhir loop
    this.logger.log('🏁 Selesai memeriksa pesanan yang kedaluwarsa.');
  }
}