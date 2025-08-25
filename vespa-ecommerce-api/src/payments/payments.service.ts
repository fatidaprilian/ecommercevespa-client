import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MidtransService } from 'src/midtrans/midtrans.service';
import { PaymentStatus, OrderStatus, Order, User, Prisma } from '@prisma/client';
import { ShipmentsService } from 'src/shipments/shipments.service';
import { AccurateSyncService } from 'src/accurate-sync/accurate-sync.service';

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
    order: Order & { items: any[], subtotal: number, taxAmount: number },
    user: User,
    shippingCost: number,
    prismaClient: Prisma.TransactionClient = this.prisma,
  ) {
    const finalAmount = order.totalAmount;

    const midtransTransaction = await this.midtransService.createSnapTransaction(
        order, 
        user, 
        shippingCost, 
        order.taxAmount 
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
        orderStatus = OrderStatus.PROCESSING;

        let paymentKey = payload.payment_type;
        
        if (payload.payment_type === 'bank_transfer' && payload.va_numbers?.length > 0) {
            const bank = payload.va_numbers[0].bank;
            paymentKey = `${bank}_va`;
        } else if (payload.payment_type === 'cstore') {
            paymentKey = `cstore_${payload.store}`;
        } else if (payload.payment_type === 'qris') {
            paymentKey = 'qris'; 
        }

        const mapping = await this.prisma.paymentMethodMapping.findUnique({
            where: { paymentMethodKey: paymentKey },
        });

        if (!mapping || !mapping.accurateBankNo) {
            this.logger.error(`Payment mapping for Midtrans key "${paymentKey}" not found or accurateBankNo is missing. Cannot sync order ${orderId} to Accurate.`);
        } else {
            this.accurateSyncService.createSalesInvoiceAndReceipt(orderId, mapping.accurateBankNo, mapping.accurateBankName)
                .catch(err => {
                    this.logger.error(`Failed to create Accurate documents for order ${orderId}`, err.stack);
                });
        }

    } else if (transactionStatus == 'pending') {
        paymentStatus = PaymentStatus.PENDING;
        orderStatus = OrderStatus.PENDING;
    } else if (transactionStatus == 'deny' || transactionStatus == 'expire' || transactionStatus == 'cancel') {
        paymentStatus = PaymentStatus.FAILED;
        orderStatus = OrderStatus.CANCELLED;
    } else {
        this.logger.log(`Callback untuk pesanan ${orderId} dengan status ${transactionStatus} diabaikan.`);
        return { message: `Callback for order ${orderId} with status ${transactionStatus} ignored.` };
    }
    
    if (currentOrder.status !== OrderStatus.PENDING && orderStatus === OrderStatus.PENDING) {
        this.logger.log(`Mengabaikan notifikasi 'pending' untuk pesanan ${orderId} karena status saat ini adalah '${currentOrder.status}'.`);
        return { message: 'Status update ignored to prevent downgrade.' };
    }
    
    if (currentOrder.status === OrderStatus.PROCESSING || currentOrder.status === OrderStatus.SHIPPED || currentOrder.status === OrderStatus.DELIVERED) {
       this.logger.log(`Mengabaikan notifikasi untuk pesanan ${orderId} karena sudah diproses.`);
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

      this.logger.log(`Status pesanan ${orderId} berhasil diperbarui menjadi ${orderStatus}`);
      return { message: 'Callback received and processed.' };

    } catch (error) {
        this.logger.error(`Gagal memperbarui pesanan ${orderId}:`, error);
        throw new Error('Failed to process callback.');
    }
  }
}