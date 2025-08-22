// file: app/orders/page.tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
    ShoppingBag, 
    ChevronRight, 
    Loader2, 
    Package, 
    Clock, 
    Truck, 
    CheckCircle,
    Search,
    ChevronLeft // <-- Tambahkan impor ini
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { Order } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDebounce } from 'use-debounce';
import { getMyOrders, PaginatedOrders } from '@/services/orderService';

// Helper (tidak berubah)
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
const formatPrice = (price: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);

// Objek konfigurasi status (tidak berubah)
const statusConfig: { [key: string]: { icon: React.ElementType; color: string; text: string } } = {
  PENDING: { icon: Clock, color: 'bg-yellow-100 text-yellow-800 border-yellow-200', text: 'Menunggu Pembayaran' },
  PROCESSING: { icon: Package, color: 'bg-orange-100 text-orange-800 border-orange-200', text: 'Sedang Diproses' },
  SHIPPED: { icon: Truck, color: 'bg-blue-100 text-blue-800 border-blue-200', text: 'Dikirim' },
  DELIVERED: { icon: CheckCircle, color: 'bg-green-100 text-green-800 border-green-200', text: 'Tiba di Tujuan' },
  CANCELLED: { icon: CheckCircle, color: 'bg-red-100 text-red-800 border-red-200', text: 'Dibatalkan' },
  PAID: { icon: Package, color: 'bg-orange-100 text-orange-800 border-orange-200', text: 'Dibayar' },
  REFUNDED: { icon: CheckCircle, color: 'bg-gray-100 text-gray-800 border-gray-200', text: 'Dikembalikan' },
};


export default function OrdersPage() {
  const { isAuthenticated } = useAuthStore();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
  
  const { data: ordersResponse, isLoading, isError } = useQuery<PaginatedOrders, Error>({
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
            <Link href="/login" className="bg-[#52616B] text-white font-bold py-3 px-6 rounded-lg hover:bg-[#1E2022] transition-colors">
              Login
            </Link>
        </div>
    );
  }

  if (isError || !orders || orders.length === 0) {
    return (
      <div className="text-center bg-white p-12 rounded-lg shadow-md mt-28 container mx-auto">
        <ShoppingBag className="mx-auto h-16 w-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">Belum Ada Pesanan</h2>
        <p className="text-gray-500 mb-6">Anda belum melakukan pesanan apa pun.</p>
        <Button asChild>
          <Link href="/products">Mulai Belanja</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pt-28">
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
                placeholder="Cari berdasarkan nomor pesanan..."
                className="pl-9 bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.1 } }
          }}
          className="space-y-6"
        >
          {orders.map((order) => {
            const currentStatus = statusConfig[order.status] || statusConfig.PENDING;
            const Icon = currentStatus.icon;
            
            return (
                <motion.div
                    key={order.id}
                    variants={{
                        hidden: { opacity: 0, y: 20 },
                        visible: { opacity: 1, y: 0 }
                    }}
                    className="bg-white p-6 rounded-xl shadow-md border hover:border-primary/50 hover:shadow-lg transition-all"
                >
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b pb-4 mb-4 gap-4">
                        <div>
                            <p className="font-bold text-lg text-gray-800">Order #{order.orderNumber}</p>
                            <p className="text-sm text-gray-500">Tanggal: {formatDate(order.createdAt)}</p>
                        </div>
                        <div className={`flex items-center gap-2 text-sm font-semibold py-1 px-3 rounded-full border ${currentStatus.color}`}>
                            <Icon className="h-4 w-4" />
                            {currentStatus.text}
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 -space-x-4">
                            {order.items.slice(0, 3).map(item => (
                                <img 
                                    key={item.id} 
                                    src={item.product.images?.[0]?.url || 'https://placehold.co/100x100'}
                                    alt={item.product.name}
                                    className="h-14 w-14 object-cover rounded-full border-2 border-white"
                                    title={item.product.name}
                                />
                            ))}
                            {order.items.length > 3 && (
                                <div className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-500 border-2 border-white">
                                    +{order.items.length - 3}
                                </div>
                            )}
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500">Total</p>
                            <p className="font-bold text-xl text-gray-800">{formatPrice(order.totalAmount)}</p>
                        </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t flex justify-end">
                         <Button asChild variant="ghost">
                            <Link href={`/orders/${order.id}`}>
                                Lihat Detail Pesanan <ChevronRight className="h-4 w-4 ml-2" />
                            </Link>
                         </Button>
                    </div>
                </motion.div>
            )
          })}
        </motion.div>

        {meta && meta.lastPage > 1 && (
            <div className="flex items-center justify-center space-x-2 pt-8">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1 || isLoading}>
                    <ChevronLeft className="h-4 w-4" />
                    <span>Sebelumnya</span>
                </Button>
                <span className="text-sm text-muted-foreground">Halaman {meta.page} dari {meta.lastPage}</span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === meta.lastPage || isLoading}>
                    <span>Berikutnya</span>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        )}
      </div>
    </div>
  );
}