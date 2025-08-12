// src/payments/payments.service.ts

import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import Xendit from 'xendit-node';
import { CreateInvoiceRequest } from 'xendit-node/invoice/models/CreateInvoiceRequest';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    @Inject('XENDIT_CLIENT') private xendit: Xendit,
  ) {}

  /**
   * Membuat permintaan pembayaran baru (invoice) di Xendit dan menyimpannya ke database.
   * @param createPaymentDto DTO untuk membuat pembayaran.
   * @param userId ID pengguna yang membuat pesanan.
   * @returns Detail pembayaran yang berhasil dibuat, termasuk URL invoice.
   */
  async createPayment(createPaymentDto: CreatePaymentDto, userId: string) {
    const { orderId } = createPaymentDto;

    // 1. Mencari pesanan di database untuk memastikan validitasnya.
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId: userId },
      include: { user: true },
    });

    if (!order) {
      throw new NotFoundException(
        `Pesanan dengan ID ${orderId} tidak ditemukan atau bukan milik Anda.`,
      );
    }

    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

      // 2. Memanggil Xendit API untuk membuat invoice baru.
      const invoiceData: CreateInvoiceRequest = {
        externalId: order.id,
        amount: Number(order.totalAmount),
        payerEmail: order.user.email,
        description: `Pembayaran untuk Pesanan Vespa Part #${order.id}`,
        successRedirectUrl: `${frontendUrl}/payment/success?order_id=${order.id}`,
        failureRedirectUrl: `${frontendUrl}/payment/failed?order_id=${order.id}`,
      };
      
      const invoice = await this.xendit.Invoice.createInvoice({ data: invoiceData });

      // 3. Menyimpan atau memperbarui entri pembayaran di database lokal.
      // `upsert` digunakan untuk mencegah duplikasi jika fungsi dipanggil lebih dari sekali.
      const payment = await this.prisma.payment.upsert({
        where: { orderId: orderId },
        update: {
          externalId: invoice.id,
          paymentUrl: invoice.invoiceUrl,
          status: 'PENDING',
        },
        create: {
          orderId: orderId,
          amount: order.totalAmount,
          paymentMethod: createPaymentDto.paymentMethod,
          status: 'PENDING',
          externalId: invoice.id,
          paymentUrl: invoice.invoiceUrl,
        },
      });

      return {
        message: 'Invoice pembayaran berhasil dibuat.',
        paymentId: payment.id,
        paymentUrl: payment.paymentUrl,
      };
    } catch (error) {
      console.error(
        'Error saat membuat invoice Xendit:',
        error.response?.data || error.message,
      );
      throw new InternalServerErrorException(
        'Gagal membuat invoice pembayaran.',
      );
    }
  }

  /**
   * Memproses notifikasi webhook dari Xendit.
   * @param payload Payload data dari webhook Xendit.
   */
  async processWebhook(payload: any) {
    const orderId = payload.external_id;

    // Menangani kasus di mana webhook dikirim untuk status selain PAID
    if (payload.status !== 'PAID') {
        console.log(
            `Webhook diterima untuk pesanan ${orderId}, tetapi status bukan PAID. Tidak ada aksi yang diambil.`,
        );
        return { message: 'Webhook diterima, tetapi tidak ada aksi yang diambil.' };
    }

    try {
      // Menggunakan transaksi database untuk memastikan kedua operasi berhasil atau tidak sama sekali (atomicity).
      return await this.prisma.$transaction(async (tx) => {
        // Mencari dan memperbarui status pembayaran.
        // Error "P2025" terjadi di sini jika record dengan orderId yang sesuai tidak ditemukan.
        await tx.payment.update({
          where: { orderId: orderId },
          data: { status: 'PAID' },
        });

        // Memperbarui status pesanan terkait.
        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: { status: 'PROCESSING' },
        });

        console.log(
          `Pembayaran untuk Pesanan ${orderId} berhasil. Status diubah menjadi PROCESSING.`,
        );

        return {
          message: `Webhook untuk pesanan ${orderId} berhasil diproses.`,
          order: updatedOrder,
        };
      });
    } catch (error) {
      // Menangani error Prisma jika record tidak ditemukan.
      if (error.code === 'P2025') {
        console.error(
          `Webhook Error: Tidak ada record pembayaran yang ditemukan untuk orderId: ${orderId}.`,
        );
        throw new NotFoundException(
          `Gagal memproses webhook: Pembayaran tidak ditemukan untuk pesanan ${orderId}`,
        );
      }

      console.error(
        `Gagal memproses webhook untuk pesanan ${orderId}:`,
        error,
      );
      throw new InternalServerErrorException(
        `Gagal memproses webhook untuk pesanan ${orderId}`,
      );
    }
  }
}
