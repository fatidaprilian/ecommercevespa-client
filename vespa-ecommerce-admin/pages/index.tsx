'use client'; 

import { motion } from 'framer-motion';
import {
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


const getDashboardStats = async () => {
  const { data } = await api.get('/dashboard/stats');
  return data;
};

const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

export default function DashboardPage() {

    const { data: stats, isLoading } = useQuery({
        queryKey: ['dashboardStats'],
        queryFn: getDashboardStats
    });

    const statsData = [
        { title: 'Total Produk', value: stats?.totalProducts ?? '...', icon: Package, color: 'text-blue-500', bgColor: 'bg-blue-100' },
        { title: 'Total Pesanan', value: stats?.totalOrdersCount ?? '...', icon: ShoppingCart, color: 'text-green-500', bgColor: 'bg-green-100' },
        { title: 'Total Pelanggan', value: stats?.totalUsers ?? '...', icon: Users, color: 'text-orange-500', bgColor: 'bg-orange-100' },
        { title: 'Pendapatan (Bulan Ini)', value: stats ? formatPrice(stats.monthlyRevenue) : '...', icon: DollarSign, color: 'text-purple-500', bgColor: 'bg-purple-100' },
    ];


  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div
        variants={containerVariants}
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
      >
        {statsData.map((stat) => (
          <motion.div
            key={stat.title}
            variants={itemVariants}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> : <div className="text-3xl font-bold">{stat.value}</div>}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 lg:grid-cols-5 gap-6"
      >
        <motion.div variants={itemVariants} className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Pesanan Terbaru</CardTitle>
            </CardHeader>
            <CardContent>
               {isLoading ? (
                 <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
               ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Pelanggan</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {stats?.recentOrders.map((order: any) => (
                            <TableRow key={order.id}>
                                <TableCell>
                                    <div className="font-medium">{order.user.name}</div>
                                </TableCell>
                                <TableCell>{order.status}</TableCell>
                                <TableCell className="text-right">{formatPrice(order.totalAmount)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
               )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Aktivitas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">Log aktivitas akan ditampilkan di sini.</p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}