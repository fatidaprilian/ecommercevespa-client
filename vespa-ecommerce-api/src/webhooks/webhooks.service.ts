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

    const receiptDetail = await this.accurateService.getSalesReceiptDetailByNumber(salesReceiptNo);
    
    if (!receiptDetail?.detailInvoice?.[0]?.invoice?.number) {
      this.logger.warn(`Could not find a valid invoice number in the detail for Sales Receipt: ${salesReceiptNo}`);
      return;
    }

    const invoiceNumber = receiptDetail.detailInvoice[0].invoice.number;
    this.logger.log(`Found associated Sales Invoice: ${invoiceNumber} for Sales Receipt: ${salesReceiptNo}`);

    const invoiceDetail = await this.accurateService.getSalesInvoiceByNumber(invoiceNumber);
    
    // Smart Webhook Logic: Ignore if the invoice was not created from a Sales Order
    if (!invoiceDetail || !invoiceDetail.fromNumber) {
      this.logger.log(`Ignoring webhook for direct invoice ${invoiceNumber} (likely a member transaction).`);
      return;
    }

    const salesOrderNumber = invoiceDetail.fromNumber;
    this.logger.log(`Found source Sales Order: ${salesOrderNumber} for Invoice: ${invoiceNumber}`);

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
        this.logger.log(`✅ SUCCESS: Order ${order.id} status updated to PROCESSING for reseller.`);
      } else {
        this.logger.log(`Order ${order.id} is already in status ${order.status}. Ignoring webhook.`);
      }
    } else {
      this.logger.warn(`Webhook processed, but no matching order found for Sales Order number: ${salesOrderNumber}`);
    }
  }

  // Biteship function remains unchanged
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