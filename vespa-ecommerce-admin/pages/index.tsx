'use client'; 

import { motion, Variants } from 'framer-motion';
import {
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  Loader2,
  Calendar,
  User,
  CreditCard,
  ArrowUpRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


const getDashboardStats = async () => {
  const { data } = await api.get('/dashboard/stats');
  return data;
};

const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
};

// Helper for status badge colors
const getStatusColor = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s === 'paid' || s === 'completed' || s === 'success') return 'bg-green-100 text-green-700 border-green-200';
    if (s === 'pending' || s === 'processing') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    if (s === 'cancelled' || s === 'failed') return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

export default function DashboardPage() {

    const { data: stats, isLoading } = useQuery({
        queryKey: ['dashboardStats'],
        queryFn: getDashboardStats
    });

    const statsData = [
        { title: 'Produk', value: stats?.totalProducts ?? '...', icon: Package, color: 'text-blue-500', bgColor: 'bg-blue-100' },
        { title: 'Pesanan', value: stats?.totalOrdersCount ?? '...', icon: ShoppingCart, color: 'text-green-500', bgColor: 'bg-green-100' },
        { title: 'Pelanggan', value: stats?.totalUsers ?? '...', icon: Users, color: 'text-orange-500', bgColor: 'bg-orange-100' },
        { title: 'Pendapatan Bulan Ini', value: stats ? formatPrice(stats.monthlyRevenue) : '...', icon: DollarSign, color: 'text-purple-500', bgColor: 'bg-purple-100' },
    ];


  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-20"
    >
      {/* Stats Cards Grid */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6"
      >
        {statsData.map((stat) => (
          <motion.div key={stat.title} variants={itemVariants}>
            <Card className="shadow-sm h-full">
              <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
                  {stat.title}
                </CardTitle>
                <div className={`p-1.5 sm:p-2 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-3 w-3 sm:h-5 sm:w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                    <div className="text-lg sm:text-3xl font-bold truncate">
                        <span className="break-all">{stat.value}</span>
                    </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 lg:grid-cols-5 gap-6"
      >
        {/* Recent Orders Section */}
        <motion.div variants={itemVariants} className="lg:col-span-3">
          <Card className="h-full shadow-sm border-none sm:border bg-transparent sm:bg-card">
            <CardHeader className="px-0 sm:px-6 pt-0 sm:pt-6">
              <CardTitle>Pesanan Terbaru</CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-6"> 
               {isLoading ? (
                 <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
               ) : (
                <>
                    {/* --- TAMPILAN DESKTOP (TABLE) --- */}
                    <div className="hidden sm:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Pelanggan</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats?.recentOrders.length === 0 && (
                                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Belum ada pesanan.</TableCell></TableRow>
                                )}
                                {stats?.recentOrders.map((order: any) => (
                                    <TableRow key={order.id}>
                                        <TableCell>
                                            <div className="font-medium">{order.user.name}</div>
                                            <div className="text-xs text-muted-foreground hidden lg:block">#{order.id.slice(0,8)}</div> 
                                        </TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                                                {order.status}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">{formatPrice(order.totalAmount)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile View Grid */}
                    <div className="sm:hidden grid grid-cols-2 gap-3">
                         {stats?.recentOrders.length === 0 && (
                            <div className="col-span-2 text-center text-sm text-muted-foreground py-4 border rounded-lg bg-card">Belum ada pesanan.</div>
                         )}
                         
                         {stats?.recentOrders.map((order: any) => (
                             <div key={order.id} className="bg-card border rounded-lg p-3 shadow-sm flex flex-col justify-between h-full relative overflow-hidden group">
                                {/* Decorative background accent */}
                                <div className={`absolute top-0 right-0 w-16 h-16 opacity-10 rounded-bl-full -mr-8 -mt-8 ${getStatusColor(order.status).split(' ')[0]}`}></div>
                                
                                <div className="space-y-2 mb-2">
                                    <div className="flex justify-between items-start">
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold uppercase ${getStatusColor(order.status)}`}>
                                            {order.status}
                                        </span>
                                    </div>
                                    
                                    <div>
                                        <p className="font-semibold text-sm truncate" title={order.user?.name || 'Pelanggan'}>{order.user?.name || 'Pelanggan'}</p>
                                        <p className="text-[10px] text-muted-foreground">#{order.id.slice(0,6)}</p>
                                    </div>
                                </div>

                                <div className="pt-2 border-t flex items-center justify-between">
                                    <span className="text-xs font-bold text-primary truncate">
                                        {formatPrice(order.totalAmount)}
                                    </span>
                                    {/* Action arrow indicator icon */}
                                    <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                                </div>
                             </div>
                         ))}
                    </div>
                </>
               )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity Section */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="h-full shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle>Aktivitas Terkini</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat aktivitas...
                </div>
              ) : stats?.recentActivities && stats.recentActivities.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentActivities.map((act: any) => (
                    <div key={act.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                      <div className={`p-2 rounded-full mt-0.5 ${
                        act.type === 'ORDER' ? 'bg-green-100 text-green-600' :
                        act.type === 'USER' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                      }`}>
                        {act.type === 'ORDER' ? <ShoppingCart className="h-3.5 w-3.5" /> :
                         act.type === 'USER' ? <User className="h-3.5 w-3.5" /> :
                         <CreditCard className="h-3.5 w-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{act.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{act.subtitle}</p>
                      </div>
                      <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {new Date(act.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 text-center space-y-2 border-2 border-dashed rounded-lg bg-muted/20">
                  <Calendar className="h-6 w-6 text-muted-foreground/50" />
                  <p className="text-muted-foreground text-xs">Belum ada log aktivitas terkini.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}