// file: vespa-ecommerce-api/src/webhooks/webhooks.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private prisma: PrismaService) {}

  async handleBiteshipTrackingUpdate(payload: any) {
    const { status, waybill_id, order_id } = payload;

    if (!waybill_id || !status) {
      this.logger.warn('Webhook received with missing waybill_id or status.', payload);
      return;
    }

    // Tentukan status pesanan di sistem Anda berdasarkan status dari Biteship
    let newStatus: OrderStatus | null = null;
    switch (status) {
      case 'picked': // Paket sudah dijemput
      case 'at_origin': // Paket di kantor cabang asal
      case 'at_destination': // Paket di kota tujuan
        newStatus = OrderStatus.SHIPPED;
        break;
      case 'delivered': // Paket terkirim
        newStatus = OrderStatus.DELIVERED;
        break;
      case 'returned': // Paket dikembalikan
        newStatus = OrderStatus.CANCELLED; // Atau status lain yang sesuai
        break;
      // Status lain seperti 'allocated', 'picking_up' bisa diabaikan
      // jika Anda tidak ingin mengubah status internal untuk itu.
    }

    if (newStatus) {
      try {
        // Cari shipment berdasarkan trackingNumber (waybill_id dari Biteship)
        const shipment = await this.prisma.shipment.findFirst({
          where: { trackingNumber: waybill_id },
        });

        if (shipment) {
          // Update status order yang terhubung dengan shipment tersebut
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