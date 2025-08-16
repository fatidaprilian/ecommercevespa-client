// file: src/shipments/shipments.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class ShipmentsService {
  constructor(private prisma: PrismaService) {}

  async createShipment(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found.`);
    }

    // --- PERBAIKAN: GENERATE NOMOR RESI LEBIH REALISTIS ---
    // Di aplikasi nyata, Anda akan memanggil API kurir di sini.
    // Untuk sekarang, kita buat format yang lebih mirip aslinya.
    const courierPrefix = order.courier.substring(0, 3).toUpperCase(); // e.g., "JNE"
    const timestamp = Date.now().toString().slice(-8);
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const trackingNumber = `${courierPrefix}${timestamp}${randomSuffix}`;
    // Contoh hasil: JNE12345678ABCD

    const shipment = await this.prisma.shipment.create({
      data: {
        orderId: order.id,
        courier: order.courier,
        trackingNumber: trackingNumber,
        shippingCost: order.shippingCost,
      },
    });

    // Update status pesanan menjadi SHIPPED
    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.SHIPPED },
    });

    console.log(`Shipment created for order ${orderId} with tracking number ${trackingNumber}`);
    return shipment;
  }
}