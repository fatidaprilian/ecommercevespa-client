// file: vespa-ecommerce-api/src/webhooks/webhooks.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderStatus } from '@prisma/client';
import { AccurateService } from 'src/accurate/accurate.service'; // Import AccurateService

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  // Suntikkan AccurateService ke dalam constructor
  constructor(
    private prisma: PrismaService,
    private accurateService: AccurateService,
  ) {}

  /**
   * Handler utama untuk semua webhook yang datang dari Accurate.
   * @param payload Data mentah dari webhook.
   */
  async handleAccurateWebhook(payload: any) {
    // Pastikan payload adalah objek dan memiliki tipe
    if (!payload || !payload.type || !payload.data || !payload.data[0]) {
      this.logger.warn('Received an invalid or empty Accurate webhook payload.', payload);
      return;
    }

    const eventType = payload.type;
    const eventData = payload.data[0];

    this.logger.log(`Processing Accurate webhook of type: ${eventType}`);

    // Logika percabangan berdasarkan tipe webhook
    switch (eventType) {
      case 'SALES_RECEIPT':
        // Panggil fungsi khusus untuk memproses penerimaan penjualan
        await this.processSalesReceiptWebhook(eventData);
        break;
      
      // Anda bisa menambahkan case lain di sini jika dibutuhkan di masa depan
      // case 'SALES_INVOICE':
      //   await this.processSalesInvoiceWebhook(eventData);
      //   break;

      default:
        this.logger.log(`No specific handler for webhook type "${eventType}". Ignoring.`);
        break;
    }
  }

  /**
   * Memproses webhook "Penerimaan Penjualan" (Sales Receipt).
   * Alur ini melacak dari SR -> SI -> SO untuk menemukan pesanan asli.
   */
  private async processSalesReceiptWebhook(eventData: any) {
    const salesReceiptNo = eventData.salesReceiptNo;
    if (!salesReceiptNo) {
      this.logger.warn('Sales Receipt webhook is missing "salesReceiptNo".', eventData);
      return;
    }

    // Langkah 1: Dapatkan detail Penerimaan Penjualan untuk menemukan Faktur
    const receiptDetail = await this.accurateService.getSalesReceiptDetailByNumber(salesReceiptNo);
    if (!receiptDetail || !receiptDetail.detailInvoice || receiptDetail.detailInvoice.length === 0) {
      this.logger.warn(`Could not fetch details or no associated invoice for Sales Receipt: ${salesReceiptNo}`);
      return;
    }

    // Ambil nomor faktur pertama yang dibayarkan
    const invoiceNumber = receiptDetail.detailInvoice[0].number;
    this.logger.log(`Found associated Sales Invoice: ${invoiceNumber} for Sales Receipt: ${salesReceiptNo}`);

    // Langkah 2: Dapatkan detail Faktur Penjualan untuk menemukan Pesanan
    const invoiceDetail = await this.accurateService.getSalesInvoiceByNumber(invoiceNumber);
    // Di Accurate, nomor SO ada di field `fromNumber`
    if (!invoiceDetail || !invoiceDetail.fromNumber) {
      this.logger.warn(`Could not fetch details or no associated Sales Order for Invoice: ${invoiceNumber}`);
      return;
    }

    const salesOrderNumber = invoiceDetail.fromNumber;
    this.logger.log(`Found source Sales Order: ${salesOrderNumber} for Invoice: ${invoiceNumber}`);

    // Langkah 3: Cari pesanan di database kita dan perbarui statusnya
    const order = await this.prisma.order.findFirst({
      where: { accurateSalesOrderNumber: salesOrderNumber },
    });

    if (order) {
      if (order.status === OrderStatus.PENDING) {
        await this.prisma.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.PROCESSING,
            accurateSalesInvoiceNumber: invoiceNumber, // Simpan nomor faktur untuk referensi
          },
        });
        this.logger.log(`✅ SUCCESS: Order ${order.id} status updated to PROCESSING via Sales Receipt webhook.`);
      } else {
        this.logger.log(`Order ${order.id} is already in status ${order.status}. Ignoring webhook.`);
      }
    } else {
      this.logger.warn(`Webhook processed, but no matching order found for Sales Order number: ${salesOrderNumber}`);
    }
  }


  // Fungsi untuk Biteship (tidak diubah)
  async handleBiteshipTrackingUpdate(payload: any) {
    const { status, courier_waybill_id: waybill_id } = payload;

    if (!waybill_id || !status) {
      this.logger.warn('Webhook received with missing waybill_id or status.', payload);
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
          this.logger.log(`Order ID ${shipment.orderId} status updated to ${newStatus} via webhook.`);
        } else {
          this.logger.warn(`Webhook received for unknown waybill_id: ${waybill_id}`);
        }
      } catch (error) {
        this.logger.error(`Failed to process webhook for waybill_id: ${waybill_id}`, error);
      }
    }
  }
}