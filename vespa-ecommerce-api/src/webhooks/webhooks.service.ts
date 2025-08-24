// file: vespa-ecommerce-api/src/webhooks/webhooks.service.ts

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
      
      case 'SALES_ORDER': // 🔥 TAMBAHAN handler untuk Sales Order
        await this.processSalesOrderWebhook(eventData);
        break;
      
      default:
        this.logger.log(`Tidak ada handler spesifik untuk tipe webhook "${eventType}". Diabaikan.`);
        break;
    }
  }

  // 🔥 HANDLER BARU untuk Sales Order webhook
  private async processSalesOrderWebhook(eventData: any) {
    const { salesOrderNo, salesOrderId, action } = eventData;
    
    this.logger.log(`Processing Sales Order webhook: ${salesOrderNo} (ID: ${salesOrderId}) - Action: ${action}`);

    try {
      const order = await this.prisma.order.findFirst({
        where: {
          accurateSalesOrderNumber: salesOrderNo
        },
        include: { user: true }
      });

      if (order) {
        // Untuk reseller, Sales Order webhook hanya confirm bahwa SO berhasil dibuat
        // Status tetap PENDING sampai Sales Invoice dibuat
        this.logger.log(`✅ Sales Order ${salesOrderNo} confirmed for order ${order.orderNumber}. Status remains PENDING until invoice is created.`);
      } else {
        this.logger.warn(`⚠️ Order not found for Sales Order: ${salesOrderNo}`);
      }
    } catch (error) {
      this.logger.error(`❌ Error processing Sales Order webhook: ${error.message}`);
    }
  }

  private async processSalesInvoiceWebhook(eventData: any) {
    const salesInvoiceNo = eventData.salesInvoiceNo;
    if (!salesInvoiceNo) {
      this.logger.warn('Webhook Faktur Penjualan tidak memiliki "salesInvoiceNo".', eventData);
      return;
    }

    this.logger.log(`Mengambil detail Faktur Penjualan untuk nomor: ${salesInvoiceNo}`);
    const invoiceDetail = await this.accurateService.getSalesInvoiceByNumber(salesInvoiceNo);

    if (!invoiceDetail || !invoiceDetail.fromNumber) {
      this.logger.log(`Mengabaikan webhook untuk faktur langsung ${salesInvoiceNo} (bukan dari Pesanan Penjualan).`);
      return;
    }

    const salesOrderNumber = invoiceDetail.fromNumber;
    this.logger.log(`Menemukan sumber Pesanan Penjualan: ${salesOrderNumber} untuk Faktur: ${salesInvoiceNo}`);

    const order = await this.prisma.order.findFirst({
      where: { accurateSalesOrderNumber: salesOrderNumber },
      include: { user: true }
    });

    if (order) {
      // 🔥 PERBAIKAN: Sales Invoice artinya admin sudah proses manual, order jadi PROCESSING
      if (order.status === OrderStatus.PENDING) {
        await this.prisma.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.PROCESSING, // 🔥 Invoice dibuat = Admin sudah proses = PROCESSING
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
      include: { user: true }
    });

    if (order) {
      // 🔥 PERBAIKAN: Sales Receipt artinya reseller sudah bayar, order bisa diproses ke SHIPPED
      if (order.status === OrderStatus.PROCESSING) {
        await this.prisma.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.SHIPPED, // 🔥 Receipt = Reseller sudah bayar = Siap kirim
            accurateSalesReceiptId: eventData.salesReceiptId,
          },
        });
        this.logger.log(`✅ BERHASIL: Pembayaran untuk pesanan ${order.id} telah dikonfirmasi. Status diubah ke SHIPPED, siap untuk dikirim.`);
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