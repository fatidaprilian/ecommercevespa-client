// file: vespa-ecommerce-api/src/shipments/shipments.service.ts

import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class ShipmentsService {
  constructor(private prisma: PrismaService) {}

  async createShipment(orderId: string, trackingNumber: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order dengan ID ${orderId} tidak ditemukan.`);
    }

    if (order.status !== OrderStatus.PROCESSING) {
        throw new UnprocessableEntityException(`Hanya pesanan dengan status PROCESSING yang dapat dikirim. Status saat ini: ${order.status}`);
    }

    const shipment = await this.prisma.shipment.create({
      data: {
        orderId: order.id,
        courier: order.courier,
        trackingNumber: trackingNumber,
        shippingCost: order.shippingCost,
      },
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.SHIPPED },
    });

    console.log(`Shipment created for order ${orderId} with tracking number ${trackingNumber}`);
    return shipment;
  }
}