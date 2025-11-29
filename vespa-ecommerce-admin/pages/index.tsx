'use client'; 

import { motion } from 'framer-motion';
import {
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  Loader2,
  Calendar,
  User,
  CreditCard,
  ArrowUpRight // Saya tambah icon ini untuk mempercantik card kecil
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

// Helper warna status
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
        { title: 'Produk', value: stats?.totalProducts ?? '...', icon: Package, color: 'text-blue-500', bgColor: 'bg-blue-100' },
        { title: 'Pesanan', value: stats?.totalOrdersCount ?? '...', icon: ShoppingCart, color: 'text-green-500', bgColor: 'bg-green-100' },
        { title: 'Pelanggan', value: stats?.totalUsers ?? '...', icon: Users, color: 'text-orange-500', bgColor: 'bg-orange-100' },
        { title: 'Pendapatan', value: stats ? formatPrice(stats.monthlyRevenue) : '...', icon: DollarSign, color: 'text-purple-500', bgColor: 'bg-purple-100' },
    ];


  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-20" // Padding bottom ekstra biar ga mentok bawah banget di HP
    >
      {/* BAGIAN STATS CARDS 
         Revisi: Mobile langsung grid-cols-2 (2 kotak per baris)
      */}
      <motion.div
        variants={containerVariants}
        // 👇 PERUBAHAN DISINI: grid-cols-2 (mobile) -> lg:grid-cols-4 (desktop)
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6"
      >
        {statsData.map((stat) => (
          <motion.div key={stat.title} variants={itemVariants}>
            <Card className="shadow-sm h-full"> {/* h-full biar tinggi kotak sama rata */}
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
                    // Font size disesuaikan biar muat di kotak kecil
                    <div className="text-lg sm:text-3xl font-bold truncate">
                        {/* Jika pendapatan, kita potong "Rp" nya di mobile biar ga sempit jika perlu, atau biarkan truncate handle */}
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
        {/* BAGIAN PESANAN TERBARU */}
        <motion.div variants={itemVariants} className="lg:col-span-3">
          <Card className="h-full shadow-sm border-none sm:border bg-transparent sm:bg-card">
            <CardHeader className="px-0 sm:px-6 pt-0 sm:pt-6"> {/* Hapus padding header di mobile */}
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

                    {/* --- TAMPILAN MOBILE (GRID KOTAK-KOTAK) --- */}
                    {/* 👇 PERUBAHAN DISINI: Pakai Grid Cols 2 biar hemat tempat ke bawah */}
                    <div className="sm:hidden grid grid-cols-2 gap-3">
                         {stats?.recentOrders.length === 0 && (
                            <div className="col-span-2 text-center text-sm text-muted-foreground py-4 border rounded-lg bg-card">Belum ada pesanan.</div>
                         )}
                         
                         {stats?.recentOrders.map((order: any) => (
                             <div key={order.id} className="bg-card border rounded-lg p-3 shadow-sm flex flex-col justify-between h-full relative overflow-hidden group">
                                {/* Hiasan background kecil */}
                                <div className={`absolute top-0 right-0 w-16 h-16 opacity-10 rounded-bl-full -mr-8 -mt-8 ${getStatusColor(order.status).split(' ')[0]}`}></div>
                                
                                <div className="space-y-2 mb-2">
                                    <div className="flex justify-between items-start">
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold uppercase ${getStatusColor(order.status)}`}>
                                            {order.status}
                                        </span>
                                    </div>
                                    
                                    <div>
                                        <p className="font-semibold text-sm truncate" title={order.user.name}>{order.user.name}</p>
                                        <p className="text-[10px] text-muted-foreground">#{order.id.slice(0,6)}</p>
                                    </div>
                                </div>

                                <div className="pt-2 border-t flex items-center justify-between">
                                    <span className="text-xs font-bold text-primary truncate">
                                        {formatPrice(order.totalAmount)}
                                    </span>
                                    {/* Icon panah kecil penanda aksi/detail */}
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

        {/* BAGIAN AKTIVITAS */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="h-full shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle>Aktivitas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center h-32 text-center space-y-2 border-2 border-dashed rounded-lg bg-muted/20">
                <Calendar className="h-6 w-6 text-muted-foreground/50" />
                <p className="text-muted-foreground text-xs">Log aktivitas kosong.</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}