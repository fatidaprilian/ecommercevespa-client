// Contoh konseptual di file baru, misal: src/orders/order-completion.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderStatus } from '@prisma/client';
import { subDays } from 'date-fns';

@Injectable()
export class OrderCompletionService {
  private readonly logger = new Logger(OrderCompletionService.name);
  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM) // Jalankan setiap jam 1 pagi
  async handleCompleteOrders() {
    this.logger.log('Running cron job to complete old delivered orders...');

    const threeDaysAgo = subDays(new Date(), 3); // Ambil tanggal 3 hari yang lalu

    const ordersToComplete = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.DELIVERED,
        updatedAt: {
          lt: threeDaysAgo, // Cari pesanan yang statusnya diupdate sebelum 3 hari yang lalu
        },
      },
    });

    if (ordersToComplete.length > 0) {
      const ids = ordersToComplete.map(order => order.id);
      await this.prisma.order.updateMany({
        where: {
          id: { in: ids },
        },
        data: {
          status: OrderStatus.COMPLETED,
        },
      });
      this.logger.log(`Completed ${ids.length} orders.`);
    } else {
      this.logger.log('No orders to complete.');
    }
  }
}