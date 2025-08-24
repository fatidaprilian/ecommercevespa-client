import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderStatus } from '@prisma/client';
import { AccurateService } from 'src/accurate/accurate.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private prisma: PrismaService,
    private accurateService: AccurateService,
  ) {}

  async handleAccurateWebhook(payload: any) {
    if (!payload || !payload.type || !payload.data || !payload.data[0]) {
      this.logger.warn('Menerima payload webhook Accurate yang tidak valid atau kosong.', payload);
      return;
    }

    const eventType = payload.type;
    const eventData = payload.data[0];

    this.logger.log(`Memproses webhook Accurate dengan tipe: ${eventType}`);

    switch (eventType) {
      case 'SALES_INVOICE':
        await this.processSalesInvoiceWebhook(eventData);
        break;
        
      case 'SALES_RECEIPT':
        await this.processSalesReceiptWebhook(eventData);
        break;
      
      default:
        this.logger.log(`Tidak ada handler spesifik untuk tipe webhook "${eventType}". Diabaikan.`);
        break;
    }
  }

  private async processSalesInvoiceWebhook(eventData: any) {
    const salesInvoiceNo = eventData.salesInvoiceNo;
    if (!salesInvoiceNo) {
      this.logger.warn('Webhook Faktur Penjualan tidak memiliki "salesInvoiceNo".', eventData);
      return;
    }

    const invoiceDetail = await this.accurateService.getSalesInvoiceByNumber(salesInvoiceNo);

    if (!invoiceDetail || !invoiceDetail.fromNumber) {
      this.logger.log(`Mengabaikan webhook untuk faktur langsung ${salesInvoiceNo} (bukan dari Pesanan Penjualan).`);
      return;
    }

    const salesOrderNumber = invoiceDetail.fromNumber;
    this.logger.log(`Menemukan sumber Pesanan Penjualan: ${salesOrderNumber} untuk Faktur: ${salesInvoiceNo}`);

    const order = await this.prisma.order.findFirst({
      where: { accurateSalesOrderNumber: salesOrderNumber },
    });

    if (order) {
      if (order.status === OrderStatus.PENDING) {
        await this.prisma.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.PROCESSING,
            accurateSalesInvoiceNumber: salesInvoiceNo,
          },
        });
        this.logger.log(`✅ BERHASIL: Status pesanan ${order.id} diubah menjadi PROCESSING setelah faktur untuk reseller dibuat.`);
      } else {
        this.logger.log(`Pesanan ${order.id} sudah dalam status ${order.status}. Mengabaikan webhook faktur.`);
      }
    } else {
      this.logger.warn(`Webhook diproses, tetapi pesanan yang cocok untuk nomor Pesanan Penjualan: ${salesOrderNumber} tidak ditemukan`);
    }
  }
  
  private async processSalesReceiptWebhook(eventData: any) {
    const salesReceiptNo = eventData.salesReceiptNo;
    if (!salesReceiptNo) {
      this.logger.warn('Webhook Penerimaan Penjualan tidak memiliki "salesReceiptNo".', eventData);
      return;
    }

    const receiptDetail = await this.accurateService.getSalesReceiptDetailByNumber(salesReceiptNo);
    
    if (!receiptDetail?.detailInvoice?.[0]?.invoice?.number) {
      this.logger.warn(`Tidak dapat menemukan nomor faktur yang valid dalam detail untuk Penerimaan Penjualan: ${salesReceiptNo}`);
      return;
    }

    const invoiceNumber = receiptDetail.detailInvoice[0].invoice.number;
    this.logger.log(`Menemukan Faktur Penjualan terkait: ${invoiceNumber} untuk Penerimaan Penjualan: ${salesReceiptNo}`);

    const invoiceDetail = await this.accurateService.getSalesInvoiceByNumber(invoiceNumber);
    
    if (!invoiceDetail || !invoiceDetail.fromNumber) {
      this.logger.log(`Mengabaikan webhook penerimaan untuk faktur langsung ${invoiceNumber} (kemungkinan transaksi member).`);
      return;
    }

    const salesOrderNumber = invoiceDetail.fromNumber;
    this.logger.log(`Menemukan sumber Pesanan Penjualan: ${salesOrderNumber} untuk Faktur: ${invoiceNumber}`);

    const order = await this.prisma.order.findFirst({
      where: { accurateSalesOrderNumber: salesOrderNumber },
    });

    if (order) {
      if (order.status === OrderStatus.PROCESSING) {
        this.logger.log(`✅ BERHASIL: Pembayaran untuk pesanan ${order.id} telah dikonfirmasi. Status tidak diubah oleh webhook ini, pengiriman akan diproses manual.`);
      } else {
        this.logger.log(`Status pesanan ${order.id} adalah ${order.status}. Mengabaikan webhook penerimaan.`);
      }
    } else {
      this.logger.warn(`Webhook penerimaan diproses, tetapi pesanan yang cocok untuk nomor Pesanan Penjualan: ${salesOrderNumber} tidak ditemukan.`);
    }
  }

  async handleBiteshipTrackingUpdate(payload: any) {
    const { status, courier_waybill_id: waybill_id } = payload;

    if (!waybill_id || !status) {
      this.logger.warn('Webhook diterima tanpa waybill_id atau status.', payload);
      return;
    }

    let newStatus: OrderStatus | null = null;
    switch (status) {
      case 'picked':
      case 'at_origin':
      case 'at_destination':
        newStatus = OrderStatus.SHIPPED;
        break;
      case 'delivered':
        newStatus = OrderStatus.DELIVERED;
        break;
      case 'returned':
        newStatus = OrderStatus.CANCELLED;
        break;
    }

    if (newStatus) {
      try {
        const shipment = await this.prisma.shipment.findFirst({
          where: { trackingNumber: waybill_id },
        });

        if (shipment) {
          await this.prisma.order.update({
            where: { id: shipment.orderId },
            data: { status: newStatus },
          });
          this.logger.log(`Status Order ID ${shipment.orderId} diubah menjadi ${newStatus} via webhook.`);
        } else {
          this.logger.warn(`Webhook diterima untuk waybill_id yang tidak dikenal: ${waybill_id}`);
        }
      } catch (error) {
        this.logger.error(`Gagal memproses webhook untuk waybill_id: ${waybill_id}`, error);
      }
    }
  }
}