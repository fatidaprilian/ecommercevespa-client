// file: vespa-ecommerce-api/src/payments/payments.service.ts

import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { XenditService } from 'src/xendit/xendit.service';
// --- PERBAIKAN 1: Impor 'Prisma' untuk mendapatkan akses ke tipe TransactionClient ---
import { PaymentStatus, OrderStatus, Order, User, Prisma } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private xenditService: XenditService,
  ) {}

  async createPaymentForOrder(
    order: Order,
    user: User,
    shippingCost: number,
    // --- PERBAIKAN 2: Gunakan tipe yang benar untuk transactional client ---
    prismaClient: Prisma.TransactionClient = this.prisma,
  ) {
    const totalAmount = order.totalAmount + shippingCost;
    const xenditInvoice = await this.xenditService.createInvoice(order, user, shippingCost);

    // Sekarang TypeScript tahu bahwa prismaClient memiliki properti .payment
    await prismaClient.payment.create({
      data: {
        order: { connect: { id: order.id } },
        amount: totalAmount,
        method: 'XENDIT_INVOICE',
        transactionId: xenditInvoice.id,
        status: PaymentStatus.PENDING,
      },
    });

    return { invoiceUrl: xenditInvoice.invoice_url };
  }

  async handleXenditCallback(payload: any, headers: any) {
    this.xenditService.validateCallbackToken(headers['x-callback-token']);

    const { external_id, status: xenditStatus } = payload;
    const orderId = external_id;

    if (!orderId) {
      return { message: 'Callback ignored: external_id missing.' };
    }

    let paymentStatus: PaymentStatus;
    let orderStatus: OrderStatus;

    if (xenditStatus === 'PAID') {
      paymentStatus = PaymentStatus.SUCCESS;
      orderStatus = OrderStatus.PAID;
    } else if (xenditStatus === 'EXPIRED') {
      paymentStatus = PaymentStatus.EXPIRED;
      orderStatus = OrderStatus.CANCELLED;
    } else {
      return { message: `Callback for order ${orderId} with status ${xenditStatus} ignored.` };
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.payment.updateMany({
          where: { orderId: orderId },
          data: { status: paymentStatus },
        });
        await tx.order.update({
          where: { id: orderId },
          data: { status: orderStatus },
        });
      });
      console.log(`Order ${orderId} status updated to ${orderStatus}`);
      return { message: 'Callback received and processed successfully.' };

    } catch (error) {
        console.error(`Failed to update order ${orderId}:`, error);
        throw new Error('Failed to process callback.');
    }
  }
}