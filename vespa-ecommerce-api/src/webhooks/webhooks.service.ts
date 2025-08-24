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
      this.logger.warn('Received an invalid or empty Accurate webhook payload.', payload);
      return;
    }

    const eventType = payload.type;
    const eventData = payload.data[0];

    this.logger.log(`Processing Accurate webhook of type: ${eventType}`);

    switch (eventType) {
      case 'SALES_RECEIPT':
        await this.processSalesReceiptWebhook(eventData);
        break;
      
      default:
        this.logger.log(`No specific handler for webhook type "${eventType}". Ignoring.`);
        break;
    }
  }

  private async processSalesReceiptWebhook(eventData: any) {
    const salesReceiptNo = eventData.salesReceiptNo;
    if (!salesReceiptNo) {
      this.logger.warn('Sales Receipt webhook is missing "salesReceiptNo".', eventData);
      return;
    }

    // Langkah 1: Dapatkan detail Sales Receipt
    const receiptDetail = await this.accurateService.getSalesReceiptDetailByNumber(salesReceiptNo);
    
    // DEBUG: Log struktur data yang diterima
    this.logger.log(`=== DEBUG: Sales Receipt Detail Structure ===`);
    this.logger.log(`Receipt Detail:`, JSON.stringify(receiptDetail, null, 2));
    
    if (!receiptDetail) {
      this.logger.warn(`Could not fetch Sales Receipt detail for: ${salesReceiptNo}`);
      return;
    }

    // Periksa berbagai kemungkinan struktur data
    let invoiceNumber: string | null = null;
    
    // Kemungkinan 1: detailInvoice array
    if (receiptDetail.detailInvoice && Array.isArray(receiptDetail.detailInvoice) && receiptDetail.detailInvoice.length > 0) {
      // Periksa field yang mungkin berisi nomor invoice
      const firstInvoice = receiptDetail.detailInvoice[0];
      invoiceNumber = firstInvoice.number || firstInvoice.invoiceNo || firstInvoice.invoiceNumber || null;
      this.logger.log(`Found invoice via detailInvoice[0]: ${JSON.stringify(firstInvoice)}`);
    }
    
    // Kemungkinan 2: detailInvoice object (bukan array)
    else if (receiptDetail.detailInvoice && !Array.isArray(receiptDetail.detailInvoice)) {
      const invoiceDetail = receiptDetail.detailInvoice;
      invoiceNumber = invoiceDetail.number || invoiceDetail.invoiceNo || invoiceDetail.invoiceNumber || null;
      this.logger.log(`Found invoice via detailInvoice object: ${JSON.stringify(invoiceDetail)}`);
    }
    
    // Kemungkinan 3: field langsung di root
    else if (receiptDetail.invoiceNumber || receiptDetail.invoiceNo || receiptDetail.refNumber) {
      invoiceNumber = receiptDetail.invoiceNumber || receiptDetail.invoiceNo || receiptDetail.refNumber;
      this.logger.log(`Found invoice via root fields: ${invoiceNumber}`);
    }
    
    // Kemungkinan 4: field dalam detail atau items
    else if (receiptDetail.detail && Array.isArray(receiptDetail.detail) && receiptDetail.detail.length > 0) {
      const firstDetail = receiptDetail.detail[0];
      invoiceNumber = firstDetail.number || firstDetail.invoiceNo || firstDetail.invoiceNumber || null;
      this.logger.log(`Found invoice via detail[0]: ${JSON.stringify(firstDetail)}`);
    }

    if (!invoiceNumber) {
      this.logger.warn(`No associated invoice found for Sales Receipt: ${salesReceiptNo}`);
      this.logger.warn(`Available fields in receipt:`, Object.keys(receiptDetail));
      return;
    }

    this.logger.log(`Found associated Sales Invoice: ${invoiceNumber} for Sales Receipt: ${salesReceiptNo}`);

    // Langkah 2: Dapatkan detail Sales Invoice
    const invoiceDetail = await this.accurateService.getSalesInvoiceByNumber(invoiceNumber);
    
    if (!invoiceDetail) {
      this.logger.warn(`Could not fetch Sales Invoice detail for: ${invoiceNumber}`);
      return;
    }

    // DEBUG: Log struktur invoice detail
    this.logger.log(`=== DEBUG: Sales Invoice Detail Structure ===`);
    this.logger.log(`Invoice Detail:`, JSON.stringify(invoiceDetail, null, 2));

    // Periksa berbagai field yang mungkin berisi nomor Sales Order
    let salesOrderNumber: string | null = null;
    
    // Field yang mungkin berisi nomor SO
    const possibleFields = ['fromNumber', 'refNumber', 'orderNumber', 'salesOrderNo', 'soNumber'];
    
    for (const field of possibleFields) {
      if (invoiceDetail[field]) {
        salesOrderNumber = invoiceDetail[field];
        this.logger.log(`Found Sales Order number via field '${field}': ${salesOrderNumber}`);
        break;
      }
    }

    if (!salesOrderNumber) {
      this.logger.warn(`No associated Sales Order found for Invoice: ${invoiceNumber}`);
      this.logger.warn(`Available fields in invoice:`, Object.keys(invoiceDetail));
      return;
    }

    this.logger.log(`Found source Sales Order: ${salesOrderNumber} for Invoice: ${invoiceNumber}`);

    // Langkah 3: Update status pesanan
    const order = await this.prisma.order.findFirst({
      where: { accurateSalesOrderNumber: salesOrderNumber },
    });

    if (order) {
      if (order.status === OrderStatus.PENDING) {
        await this.prisma.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.PROCESSING,
            accurateSalesInvoiceNumber: invoiceNumber,
          },
        });
        this.logger.log(`✅ SUCCESS: Order ${order.id} status updated to PROCESSING via Sales Receipt webhook.`);
      } else {
        this.logger.log(`Order ${order.id} is already in status ${order.status}. Ignoring webhook.`);
      }
    } else {
      this.logger.warn(`Webhook processed, but no matching order found for Sales Order number: ${salesOrderNumber}`);
      
      // Coba cari dengan pattern lain jika ada
      const alternativeOrder = await this.prisma.order.findFirst({
        where: { 
          OR: [
            { orderNumber: { contains: salesOrderNumber } },
            { accurateSalesInvoiceNumber: invoiceNumber }
          ]
        },
      });
      
      if (alternativeOrder) {
        this.logger.log(`Found alternative order match: ${alternativeOrder.id}`);
        if (alternativeOrder.status === OrderStatus.PENDING) {
          await this.prisma.order.update({
            where: { id: alternativeOrder.id },
            data: {
              status: OrderStatus.PROCESSING,
              accurateSalesInvoiceNumber: invoiceNumber,
              accurateSalesOrderNumber: salesOrderNumber, // Update jika kosong
            },
          });
          this.logger.log(`✅ SUCCESS: Alternative order ${alternativeOrder.id} status updated to PROCESSING.`);
        }
      }
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