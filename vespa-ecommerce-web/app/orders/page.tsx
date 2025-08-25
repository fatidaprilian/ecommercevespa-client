'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ShoppingBag, 
    ChevronRight, 
    Loader2, 
    Package, 
    Clock, 
    Truck, 
    CheckCircle,
    XCircle,
    RefreshCw,
    Search,
    ChevronLeft
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { Order } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDebounce } from 'use-debounce';
import { getMyOrders, PaginatedOrders } from '@/services/orderService';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
const formatPrice = (price: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);

const statusConfig: { [key: string]: { icon: React.ElementType; color: string; text: string } } = {
  PENDING: { icon: Clock, color: 'bg-yellow-100 text-yellow-800 border-yellow-300', text: 'Menunggu Pembayaran' },
  PAID: { icon: Package, color: 'bg-blue-100 text-blue-800 border-blue-300', text: 'Dibayar' },
  PROCESSING: { icon: Package, color: 'bg-orange-100 text-orange-800 border-orange-300', text: 'Sedang Diproses' },
  SHIPPED: { icon: Truck, color: 'bg-indigo-100 text-indigo-800 border-indigo-300', text: 'Dikirim' },
  DELIVERED: { icon: CheckCircle, color: 'bg-green-100 text-green-800 border-green-300', text: 'Tiba di Tujuan' },
  COMPLETED: { icon: CheckCircle, color: 'bg-green-100 text-green-800 border-green-300', text: 'Selesai' },
  CANCELLED: { icon: XCircle, color: 'bg-red-100 text-red-800 border-red-300', text: 'Dibatalkan' },
  REFUNDED: { icon: RefreshCw, color: 'bg-gray-100 text-gray-800 border-gray-300', text: 'Dikembalikan' },
};


export default function OrdersPage() {
  const { isAuthenticated } = useAuthStore();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
  
  const { data: ordersResponse, isLoading, isError, isPlaceholderData } = useQuery<PaginatedOrders, Error>({
    queryKey: ['my-orders', page, debouncedSearchTerm],
    queryFn: () => getMyOrders({ page, search: debouncedSearchTerm }),
    enabled: isAuthenticated,
    keepPreviousData: true,
  });

  const orders = ordersResponse?.data;
  const meta = ordersResponse?.meta;

  if (isLoading && !orders) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
       <div className="text-center bg-white p-12 rounded-lg shadow-md mt-28 container mx-auto">
            <ShoppingBag className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">Riwayat Pesanan</h2>
            <p className="text-gray-500 mb-6">Silakan login untuk melihat riwayat pesanan Anda.</p>
            <Button asChild size="lg">
              <Link href="/login">Login</Link>
            </Button>
        </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pt-28 pb-20">
      <div className="container mx-auto px-4 py-12">
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
        >
            <h1 className="text-4xl font-bold text-gray-800 font-playfair">
                Riwayat Pesanan Saya
            </h1>
            <p className="text-lg text-gray-600 mt-1">
                Lacak dan lihat detail semua transaksi Anda di sini.
            </p>
        </motion.div>

        <div className="relative w-full max-w-lg mb-8">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Cari No. Pesanan atau Nama Produk..."
                className="pl-9 bg-white shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        
        <AnimatePresence>
          {isError ? (
            <p className="text-center text-red-500">Gagal memuat pesanan.</p>
          ) : !isLoading && (!orders || orders.length === 0) ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center bg-white p-12 rounded-lg shadow-md border"
            >
              <ShoppingBag className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h2 className="text-2xl font-semibold text-gray-700 mb-2">
                {debouncedSearchTerm ? 'Pesanan Tidak Ditemukan' : 'Belum Ada Pesanan'}
              </h2>
              <p className="text-gray-500 mb-6">
                {debouncedSearchTerm ? 'Coba kata kunci lain atau hapus filter pencarian.' : 'Anda belum melakukan pesanan apa pun.'}
              </p>
              <Button asChild>
                <Link href="/products">Mulai Belanja</Link>
              </Button>
            </motion.div>
          ) : (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
              className="space-y-6"
            >
              {(isLoading ? Array.from({ length: 5 }) : orders)?.map((order: Order, index) => {
                if (!order) { 
                    return <SkeletonCard key={index} />;
                }
                const currentStatus = statusConfig[order.status] || statusConfig.PENDING;
                const Icon = currentStatus.icon;
                
                return (
                    <motion.div
                        key={order.id}
                        variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                        layout
                    >
                      <Card className="hover:shadow-lg transition-shadow duration-300">
                          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div>
                                <p className="font-bold text-lg text-gray-800">Order #{order.orderNumber}</p>
                                <p className="text-sm text-gray-500">Tanggal: {formatDate(order.createdAt)}</p>
                              </div>
                              <Badge variant="outline" className={`font-semibold text-sm py-1 px-3 border ${currentStatus.color}`}>
                                  <Icon className="h-4 w-4 mr-2" />
                                  {currentStatus.text}
                              </Badge>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 -space-x-4">
                                    {order.items.slice(0, 3).map(item => (
                                        <img 
                                            key={item.id} 
                                            src={item.product.images?.[0]?.url || 'https://placehold.co/100x100'}
                                            alt={item.product.name}
                                            className="h-16 w-16 object-cover rounded-full border-2 border-white shadow-sm"
                                            title={item.product.name}
                                        />
                                    ))}
                                    {order.items.length > 3 && (
                                        <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-500 border-2 border-white shadow-sm">
                                            +{order.items.length - 3}
                                        </div>
                                    )}
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-500">Total Pembayaran</p>
                                    <p className="font-bold text-xl text-gray-800">{formatPrice(order.totalAmount)}</p>
                                </div>
                            </div>
                          </CardContent>
                          <CardFooter className="flex justify-end">
                            <Button asChild variant="ghost" className="text-primary hover:text-primary">
                                <Link href={`/orders/${order.id}`}>
                                    Lihat Detail Pesanan <ChevronRight className="h-4 w-4 ml-2" />
                                </Link>
                            </Button>
                          </CardFooter>
                      </Card>
                    </motion.div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {meta && meta.lastPage > 1 && (
            <div className="flex items-center justify-center space-x-2 pt-12">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1 || isPlaceholderData}>
                    <ChevronLeft className="h-4 w-4" />
                    <span>Sebelumnya</span>
                </Button>
                <span className="text-sm text-muted-foreground">Halaman {meta.page} dari {meta.lastPage}</span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === meta.lastPage || isPlaceholderData}>
                    <span>Berikutnya</span>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        )}
      </div>
    </div>
  );
}

const SkeletonCard = () => (
    <Card className="animate-pulse">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
                <div className="h-7 w-40 bg-gray-200 rounded-md"></div>
                <div className="h-4 w-48 bg-gray-200 rounded-md mt-2"></div>
            </div>
            <div className="h-8 w-36 bg-gray-200 rounded-full"></div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 -space-x-4">
                <div className="h-16 w-16 bg-gray-200 rounded-full border-2 border-white"></div>
                <div className="h-16 w-16 bg-gray-200 rounded-full border-2 border-white"></div>
              </div>
              <div className="text-right">
                  <div className="h-4 w-16 bg-gray-200 rounded-md mb-2"></div>
                  <div className="h-7 w-28 bg-gray-200 rounded-md"></div>
              </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
            <div className="h-9 w-44 bg-gray-200 rounded-md"></div>
        </CardFooter>
    </Card>
);