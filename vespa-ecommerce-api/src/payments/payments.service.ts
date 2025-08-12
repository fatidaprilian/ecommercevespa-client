import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { XenditService } from 'src/xendit/xendit.service';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private xenditService: XenditService,
  ) {}

  async createPayment(userId: string, createPaymentDto: CreatePaymentDto) {
    const { orderId, paymentMethod } = createPaymentDto;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId, userId: userId },
      include: { user: true },
    });

    if (!order) {
      throw new NotFoundException(
        `Order dengan ID ${orderId} tidak ditemukan untuk user ini.`,
      );
    }
    if (order.status !== OrderStatus.PENDING) {
      throw new UnprocessableEntityException('Order tidak dalam status PENDING.');
    }

    // Panggil Xendit Service untuk membuat invoice
    const invoice = await this.xenditService.createInvoice({
      externalId: order.orderNumber, // Menggunakan camelCase
      amount: order.totalAmount,
      payerEmail: order.user.email,
      description: `Pembayaran untuk Order #${order.orderNumber}`,
    });

    // Simpan data pembayaran ke database kita
    const payment = await this.prisma.payment.create({
      data: {
        orderId: orderId,
        amount: order.totalAmount,
        method: paymentMethod,
        status: PaymentStatus.PENDING,
        transactionId: invoice.id,
      },
    });

    return {
      payment,
      // --- PERBAIKAN FINAL ADA DI SINI ---
      paymentUrl: invoice.invoiceUrl, // Menggunakan camelCase sesuai tipe data
    };
  }

  async handleWebhook(headers: any, body: any) {
    this.xenditService.validateCallbackToken(headers['x-callback-token']);

    const { external_id, status } = body;

    const order = await this.prisma.order.findUnique({
      where: { orderNumber: external_id },
    });

    if (!order) {
      throw new NotFoundException(`Order dengan nomor ${external_id} tidak ditemukan.`);
    }

    if (status === 'PAID') {
      await this.prisma.$transaction(async (tx) => {
        await tx.payment.updateMany({
          where: { orderId: order.id },
          data: { status: PaymentStatus.SUCCESS },
        });
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.PAID },
        });
      });
    } else if (status === 'EXPIRED') {
      await this.prisma.$transaction(async (tx) => {
        await tx.payment.updateMany({
          where: { orderId: order.id },
          data: { status: PaymentStatus.EXPIRED },
        });
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.CANCELLED },
        });
      });
    }

    return { success: true };
  }
}