// src/modules/dashboard/dashboard.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderStatus, Role } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const totalProducts = await this.prisma.product.count();
    const totalOrdersCount = await this.prisma.order.count();
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
          in: [
            OrderStatus.PAID,
            OrderStatus.PROCESSING,
            OrderStatus.SHIPPED,
            OrderStatus.DELIVERED,
            OrderStatus.COMPLETED,
          ],
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

    const recentUsers = await this.prisma.user.findMany({
      take: 3,
      where: {
        role: {
          in: [Role.MEMBER, Role.RESELLER],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    });

    const recentSyncs = await this.prisma.erpSyncLog.findMany({
      take: 3,
      orderBy: {
        runAt: 'desc',
      },
      select: {
        id: true,
        syncType: true,
        status: true,
        message: true,
        runAt: true,
      },
    });

    const orderActivities = recentOrders.map((o) => ({
      id: `ord-${o.id}`,
      type: 'ORDER',
      title: `Pesanan #${o.id.slice(0, 6)} (${o.status})`,
      subtitle: `Oleh ${o.user?.name || 'Pelanggan'}`,
      timestamp: o.createdAt,
    }));

    const userActivities = recentUsers.map((u) => ({
      id: `usr-${u.id}`,
      type: 'USER',
      title: `Pengguna baru mendaftar`,
      subtitle: u.name,
      timestamp: u.createdAt,
    }));

    const syncActivities = recentSyncs.map((s) => ({
      id: `sync-${s.id}`,
      type: 'SYNC',
      title: `Sinkronisasi Accurate ERP`,
      subtitle: s.message || `Tipe: ${s.syncType} (${s.status})`,
      timestamp: s.runAt,
    }));

    const recentActivities = [...orderActivities, ...userActivities, ...syncActivities]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 6);

    return {
      totalProducts,
      totalOrdersCount,
      totalUsers,
      monthlyRevenue: monthlyRevenue._sum.totalAmount || 0,
      recentOrders,
      recentActivities,
    };
  }
}