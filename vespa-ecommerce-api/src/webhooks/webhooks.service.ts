// file: vespa-ecommerce-api/src/webhooks/webhooks.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private prisma: PrismaService) {}

  // 👇 --- PENAMBAHAN FUNGSI BARU DIMULAI DI SINI --- 👇
  /**
   * Menangani webhook dari Accurate saat Faktur Penjualan (Sales Invoice) dibuat.
   * Ini menandakan admin telah memproses Pesanan Penjualan dari reseller.
   */
  async handleAccurateSalesInvoiceCreated(payload: any) {
    // Ambil nomor Pesanan Penjualan dari data webhook.
    // Accurate biasanya menyimpannya di 'fromNumber' atau 'orderNumber'.
    const salesOrderNumber = payload.orderNumber;

    if (!salesOrderNumber) {
      this.logger.warn('Accurate webhook for Sales Invoice received without a source Sales Order number.', payload);
      return;
    }

    this.logger.log(`Received Accurate webhook for Sales Order: ${salesOrderNumber}`);

    try {
      // Cari pesanan di database kita yang cocok dengan nomor Pesanan Penjualan.
      const order = await this.prisma.order.findFirst({
        where: { accurateSalesOrderNumber: salesOrderNumber },
      });

      if (order) {
        // Jika pesanan ditemukan dan statusnya masih PENDING, ubah menjadi PROCESSING.
        if (order.status === OrderStatus.PENDING) {
          await this.prisma.order.update({
            where: { id: order.id },
            data: { 
              status: OrderStatus.PROCESSING,
              accurateSalesInvoiceNumber: payload.number, // Simpan juga nomor faktur penjualannya
            },
          });
          this.logger.log(`Order ID ${order.id} status updated to PROCESSING via Accurate webhook.`);
        } else {
          this.logger.log(`Order ID ${order.id} is already in status ${order.status}. Ignoring webhook.`);
        }
      } else {
        this.logger.warn(`Webhook received for an unknown Sales Order number: ${salesOrderNumber}`);
      }
    } catch (error) {
      this.logger.error(`Failed to process Accurate webhook for SO Number: ${salesOrderNumber}`, error);
    }
  }
  // 👆 --- PENAMBAHAN FUNGSI BARU SELESAI --- 👆


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