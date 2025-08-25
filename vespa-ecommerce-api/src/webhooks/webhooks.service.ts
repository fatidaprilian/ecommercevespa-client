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
      
      case 'SALES_ORDER':
        await this.processSalesOrderWebhook(eventData);
        break;
      
      default:
        this.logger.log(`Tidak ada handler spesifik untuk tipe webhook "${eventType}". Diabaikan.`);
        break;
    }
  }

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
        this.logger.log(`✅ Sales Order ${salesOrderNo} confirmed for order ${order.orderNumber}. Status remains PENDING until payment received.`);
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
    
    try {
      const invoiceDetail = await this.accurateService.getSalesInvoiceByNumber(salesInvoiceNo);

      if (!invoiceDetail) {
        this.logger.warn(`❌ Tidak dapat mengambil detail invoice: ${salesInvoiceNo}`);
        return;
      }

      let salesOrderNumber: string | null = null;
      
      if (invoiceDetail.detailItem && invoiceDetail.detailItem.length > 0) {
        const firstItem = invoiceDetail.detailItem[0];
        if (firstItem.salesOrder?.number) {
          salesOrderNumber = firstItem.salesOrder.number;
          this.logger.log(`🎯 Found Sales Order from detailItem: ${salesOrderNumber}`);
        } else if (firstItem.salesOrderId) {
          this.logger.log(`🔍 Found salesOrderId: ${firstItem.salesOrderId}, but no sales order number in detailItem`);
        }
      }

      if (!salesOrderNumber) {
        const fromNumber = invoiceDetail.fromNumber || 
                           invoiceDetail.from_number || 
                           invoiceDetail.salesOrderNumber ||
                           invoiceDetail.sales_order_number;
        if (fromNumber) {
          salesOrderNumber = fromNumber;
          this.logger.log(`🔍 Found Sales Order from fromNumber field: ${salesOrderNumber}`);
        }
      }

      if (!salesOrderNumber) {
        this.logger.log(`Mengabaikan webhook untuk faktur langsung ${salesInvoiceNo} (tidak terhubung dengan Sales Order).`);
        return;
      }

      this.logger.log(`✅ Menemukan sumber Pesanan Penjualan: ${salesOrderNumber} untuk Faktur: ${salesInvoiceNo}`);

      const order = await this.prisma.order.findFirst({
        where: { accurateSalesOrderNumber: salesOrderNumber },
        include: { user: true }
      });

      if (order) {
        if (order.status === OrderStatus.PENDING) {
          await this.prisma.order.update({
            where: { id: order.id },
            data: {
              accurateSalesInvoiceNumber: salesInvoiceNo,
              status: OrderStatus.PROCESSING,
            },
          });
          this.logger.log(`✅ BERHASIL: Invoice ${salesInvoiceNo} (LUNAS) di-link ke order ${order.id} (${order.orderNumber}). Status diubah ke PROCESSING.`);
        } else {
          this.logger.log(`Pesanan ${order.id} sudah dalam status ${order.status}. Mengabaikan webhook faktur.`);
        }
      } else {
        this.logger.warn(`❌ Order tidak ditemukan untuk Sales Order: ${salesOrderNumber}`);
      }

    } catch (error) {
      this.logger.error(`❌ Error processing Sales Invoice webhook: ${error.message}`, error);
    }
  }

  private async processSalesReceiptWebhook(eventData: any) {
    const salesReceiptNo = eventData.salesReceiptNo;
    if (!salesReceiptNo) {
      this.logger.warn('Webhook Penerimaan Penjualan tidak memiliki "salesReceiptNo".', eventData);
      return;
    }

    try {
      const receiptDetail = await this.accurateService.getSalesReceiptDetailByNumber(salesReceiptNo);
      
      if (!receiptDetail?.detailInvoice?.[0]?.invoice?.number) {
        this.logger.warn(`Tidak dapat menemukan nomor faktur yang valid dalam detail untuk Penerimaan Penjualan: ${salesReceiptNo}`);
        return;
      }

      const invoiceNumber = receiptDetail.detailInvoice[0].invoice.number;
      this.logger.log(`Menemukan Faktur Penjualan terkait: ${invoiceNumber} untuk Penerimaan Penjualan: ${salesReceiptNo}`);

      const order = await this.prisma.order.findFirst({
        where: { 
          accurateSalesInvoiceNumber: invoiceNumber 
        },
        include: { user: true }
      });

      if (order) {
        if (order.status === OrderStatus.PENDING) {
          await this.prisma.order.update({
            where: { id: order.id },
            data: {
              status: OrderStatus.PROCESSING,
              accurateSalesReceiptId: eventData.salesReceiptId,
            },
          });
          this.logger.log(`✅ BERHASIL: Pembayaran untuk pesanan ${order.id} (MEMBER) telah dikonfirmasi. Status diubah ke PROCESSING.`);
        } else {
          this.logger.log(`Status pesanan ${order.id} adalah ${order.status}. Mengabaikan webhook penerimaan.`);
        }
      } else {
        this.logger.warn(`Webhook penerimaan diproses, tetapi pesanan yang cocok untuk invoice: ${invoiceNumber} tidak ditemukan.`);
      }
    } catch (error) {
      this.logger.error(`❌ Error processing Sales Receipt webhook: ${error.message}`, error);
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