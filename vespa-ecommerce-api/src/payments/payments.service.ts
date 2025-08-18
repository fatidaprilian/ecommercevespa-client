// file: vespa-ecommerce-api/src/payments/payments.service.ts

import { Injectable, Logger } from '@nestjs/common'; // Import Logger for better logging
import { PrismaService } from 'src/prisma/prisma.service';
import { MidtransService } from 'src/midtrans/midtrans.service';
import { PaymentStatus, OrderStatus, Order, User, Prisma } from '@prisma/client';
import { ShipmentsService } from 'src/shipments/shipments.service';

@Injectable()
export class PaymentsService {
  // --- Create a logger instance for better debugging ---
  private readonly logger = new Logger(PaymentsService.name);

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
    
    // --- 1. Fetch the current order from the database ---
    const currentOrder = await this.prisma.order.findUnique({
        where: { id: orderId },
    });

    if (!currentOrder) {
        this.logger.warn(`Webhook received for non-existent order ID: ${orderId}`);
        return { message: `Order with ID ${orderId} not found.` };
    }
    
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
        this.logger.log(`Callback for order ${orderId} with status ${transactionStatus} ignored.`);
        return { message: `Callback for order ${orderId} with status ${transactionStatus} ignored.` };
    }

    // --- 2. Implement state transition logic to prevent downgrades ---
    // An order that is already PROCESSING or further along should not be reverted to PENDING.
    if (currentOrder.status !== OrderStatus.PENDING && orderStatus === OrderStatus.PENDING) {
        this.logger.log(`Ignoring pending notification for order ${orderId} because its current status is '${currentOrder.status}'.`);
        return { message: 'Status update ignored to prevent downgrade.' };
    }
    
    // An order that's already settled should not be changed by any other status update.
    if (currentOrder.status === OrderStatus.PROCESSING || currentOrder.status === OrderStatus.SHIPPED || currentOrder.status === OrderStatus.DELIVERED) {
       this.logger.log(`Ignoring notification for order ${orderId} as it's already processed.`);
       return { message: 'Order already processed, update ignored.' };
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

      this.logger.log(`Order ${orderId} status updated automatically to ${orderStatus}`);
      return { message: 'Callback received and processed.' };

    } catch (error) {
        this.logger.error(`Failed to update order ${orderId}:`, error);
        throw new Error('Failed to process callback.');
    }
  }
}