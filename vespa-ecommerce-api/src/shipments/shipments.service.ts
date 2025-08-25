// file: vespa-ecommerce-api/src/shipments/shipments.service.ts

import { Injectable, NotFoundException, UnprocessableEntityException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderStatus } from '@prisma/client';
import { ShippingService } from 'src/shipping/shipping.service';

@Injectable()
export class ShipmentsService {
  constructor(
    private prisma: PrismaService,
    private shippingService: ShippingService,
  ) {}

  async createShipment(orderId: string, courierCompany: string, courierType: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { 
        user: true, 
        items: { include: { product: true } } 
      },
    });

    if (!order) {
      throw new NotFoundException(`Order dengan ID ${orderId} tidak ditemukan.`);
    }

    if (!order.destinationAreaId) {
        throw new BadRequestException(`Pesanan ini tidak memiliki data Area ID tujuan yang diperlukan untuk membuat pengiriman.`);
    }

    if (order.status !== OrderStatus.PROCESSING) {
        throw new UnprocessableEntityException(`Hanya pesanan dengan status PROCESSING yang dapat dikirim. Status saat ini: ${order.status}`);
    }

    const bookingResult = await this.shippingService.createShipmentBooking(
        order,
        { company: courierCompany, type: courierType }
    );

    const trackingNumber = bookingResult.courier.waybill_id || bookingResult.courier.tracking_id;

    if (!trackingNumber) {
        throw new NotFoundException('Nomor resi (waybill_id) tidak ditemukan dari respons Biteship.');
    }

    const shipment = await this.prisma.shipment.create({
      data: {
        orderId: order.id,
        courier: bookingResult.courier.company.toUpperCase(),
        trackingNumber: trackingNumber,
        shippingCost: bookingResult.price,
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