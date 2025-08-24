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

  // Handler untuk Sales Order webhook
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

  // 🔧 PERBAIKAN: Handler untuk Sales Invoice webhook - Pendekatan alternatif
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

      // 🔍 DEBUGGING: Log full invoice detail untuk analisis
      this.logger.log(`🔍 Full Invoice Detail for ${salesInvoiceNo}:`, JSON.stringify(invoiceDetail, null, 2));

      // 🔧 PENDEKATAN ALTERNATIF 1: Cari berdasarkan customer + timing
      const customerNo = invoiceDetail.customer?.customerNo;
      const invoiceDate = invoiceDetail.transDate;

      this.logger.log(`🔍 Searching order by customer: ${customerNo} around date: ${invoiceDate}`);

      if (customerNo) {
        // Cari order dengan customer yang sama dalam timeframe yang masuk akal (misal 7 hari terakhir)
        const recentOrders = await this.prisma.order.findMany({
          where: {
            user: {
              accurateCustomerNo: customerNo
            },
            status: OrderStatus.PENDING,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 hari terakhir
            }
          },
          include: { user: true },
          orderBy: { createdAt: 'desc' }
        });

        this.logger.log(`🔍 Found ${recentOrders.length} recent PENDING orders for customer ${customerNo}`);

        if (recentOrders.length === 1) {
          // Jika hanya ada 1 order PENDING, kemungkinan besar itu yang benar
          const order = recentOrders[0];
          
          await this.prisma.order.update({
            where: { id: order.id },
            data: {
              accurateSalesInvoiceNumber: salesInvoiceNo,
              // Status tetap PENDING - belum dibayar reseller
            },
          });
          
          this.logger.log(`✅ BERHASIL: Invoice ${salesInvoiceNo} linked to order ${order.id} based on customer match. Status tetap PENDING - menunggu pembayaran reseller.`);
          return;
        } else if (recentOrders.length > 1) {
          this.logger.warn(`⚠️ Multiple PENDING orders found for customer ${customerNo}. Manual intervention may be needed.`);
          // Log semua orders untuk manual check
          recentOrders.forEach(order => {
            this.logger.log(`   - Order ${order.id}: ${order.orderNumber} (SO: ${order.accurateSalesOrderNumber})`);
          });
        } else {
          this.logger.warn(`⚠️ No PENDING orders found for customer ${customerNo}`);
        }
      }

      // 🔧 PENDEKATAN ALTERNATIF 2: Cari berdasarkan amount matching
      const invoiceAmount = invoiceDetail.amount || invoiceDetail.totalAmount || invoiceDetail.subTotal;
      if (invoiceAmount) {
        this.logger.log(`🔍 Searching order by amount: ${invoiceAmount}`);
        
        const ordersByAmount = await this.prisma.order.findMany({
          where: {
            totalAmount: parseFloat(invoiceAmount),
            status: OrderStatus.PENDING
          },
          include: { user: true }
        });

        if (ordersByAmount.length === 1) {
          const order = ordersByAmount[0];
          
          await this.prisma.order.update({
            where: { id: order.id },
            data: {
              accurateSalesInvoiceNumber: salesInvoiceNo,
            },
          });
          
          this.logger.log(`✅ BERHASIL: Invoice ${salesInvoiceNo} linked to order ${order.id} based on amount match (${invoiceAmount}). Status tetap PENDING.`);
          return;
        }
      }

      // Jika tidak ada yang cocok, log untuk manual intervention
      this.logger.warn(`⚠️ Could not automatically link invoice ${salesInvoiceNo} to any order. Manual intervention required.`);

    } catch (error) {
      this.logger.error(`❌ Error processing Sales Invoice webhook: ${error.message}`, error);
    }
  }

  // Handler untuk Sales Receipt webhook
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

      // 🔧 PERBAIKAN: Cari order berdasarkan invoice number yang sudah di-link sebelumnya
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
          this.logger.log(`✅ BERHASIL: Pembayaran untuk pesanan ${order.id} telah dikonfirmasi. Status diubah ke PROCESSING, siap untuk diproses.`);
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