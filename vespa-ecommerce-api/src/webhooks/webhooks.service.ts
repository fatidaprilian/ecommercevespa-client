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
      // 👇 --- AWAL PERUBAHAN --- 👇
      case 'SALES_INVOICE':
        await this.processSalesInvoiceWebhook(eventData);
        break;
      // 👆 --- AKHIR PERUBAHAN --- 👆
        
      case 'SALES_RECEIPT':
        await this.processSalesReceiptWebhook(eventData);
        break;
      
      default:
        this.logger.log(`Tidak ada handler spesifik untuk tipe webhook "${eventType}". Diabaikan.`);
        break;
    }
  }

  // 👇 --- AWAL PERUBAHAN: FUNGSI BARU DITAMBAHKAN --- 👇
  /**
   * Memproses webhook Faktur Penjualan (Sales Invoice) dari Accurate.
   * Ini terpicu ketika admin membuat faktur dari Pesanan Penjualan (Sales Order).
   * Fungsi ini akan mengubah status pesanan menjadi PROCESSING untuk memberitahu reseller.
   */
  private async processSalesInvoiceWebhook(eventData: any) {
    const salesInvoiceNo = eventData.salesInvoiceNo;
    if (!salesInvoiceNo) {
      this.logger.warn('Webhook Faktur Penjualan tidak memiliki "salesInvoiceNo".', eventData);
      return;
    }

    // Ambil detail faktur untuk menemukan nomor Pesanan Penjualan (SO) asalnya.
    const invoiceDetail = await this.accurateService.getSalesInvoiceByNumber(salesInvoiceNo);

    // Pemeriksaan ini sangat penting: kita hanya memproses faktur yang berasal dari SO (alur reseller).
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
      // Hanya perbarui jika statusnya masih PENDING.
      if (order.status === OrderStatus.PENDING) {
        await this.prisma.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.PROCESSING, // Ubah status menjadi PROCESSING
            accurateSalesInvoiceNumber: salesInvoiceNo, // Simpan nomor faktur
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
  // 👆 --- AKHIR PERUBAHAN --- 👆

  /**
   * Memproses webhook Penerimaan Penjualan (Sales Receipt) dari Accurate.
   * Ini terpicu ketika admin mencatat pembayaran untuk sebuah faktur.
   */
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
    
    // Abaikan jika faktur tidak berasal dari Pesanan Penjualan (alur member).
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
      // Logika ini bisa dikembangkan, misalnya mengubah status dari PROCESSING menjadi PAID
      if (order.status === OrderStatus.PROCESSING) {
        // Contoh: await this.prisma.order.update({ where: { id: order.id }, data: { status: OrderStatus.PAID }});
        this.logger.log(`✅ BERHASIL: Pembayaran untuk pesanan ${order.id} telah dikonfirmasi. Aksi lebih lanjut bisa ditambahkan di sini.`);
      } else {
        this.logger.log(`Status pesanan ${order.id} adalah ${order.status}. Mengabaikan webhook penerimaan untuk saat ini.`);
      }
    } else {
      this.logger.warn(`Webhook penerimaan diproses, tetapi pesanan yang cocok untuk nomor Pesanan Penjualan: ${salesOrderNumber} tidak ditemukan.`);
    }
  }

  // Fungsi untuk Biteship (tidak ada perubahan)
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