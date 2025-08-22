// src/modules/dashboard/dashboard.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderStatus, Role } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const totalProducts = await this.prisma.product.count();
    const totalOrdersCount = await this.prisma.order.count(); // Diubah dari newOrdersCount
    const totalUsers = await this.prisma.user.count({
      where: {
        role: {
          in: [Role.MEMBER, Role.RESELLER],
        },
      },
    });

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthlyRevenue = await this.prisma.order.aggregate({
      _sum: {
        totalAmount: true,
      },
      where: {
        status: {
          in: [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED],
        },
        createdAt: {
          gte: firstDayOfMonth,
        },
      },
    });

    const recentOrders = await this.prisma.order.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: { name: true },
        },
      },
    });

    return {
      totalProducts,
      totalOrdersCount, // Mengirim total pesanan
      totalUsers,
      monthlyRevenue: monthlyRevenue._sum.totalAmount || 0,
      recentOrders,
    };
  }
}