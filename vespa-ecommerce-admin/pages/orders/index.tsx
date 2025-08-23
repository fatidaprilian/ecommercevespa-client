// file: vespa-ecommerce-admin/pages/orders/index.tsx

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Eye, Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getOrders, Order, PaginatedOrders } from '@/services/orderService';

// Varian animasi
const pageVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { ease: 'easeOut', duration: 0.4 } },
  exit: { opacity: 0, transition: { ease: 'easeIn', duration: 0.2 } },
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
};

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

  const { data: ordersResponse, isLoading, isError, error } = useQuery<PaginatedOrders, Error>({
    queryKey: ['orders', page, debouncedSearchTerm],
    queryFn: () => getOrders({ page, search: debouncedSearchTerm }),
    keepPreviousData: true,
  });

  const orders = ordersResponse?.data;
  const meta = ordersResponse?.meta;

  return (
    <motion.div className="space-y-6" initial="hidden" animate="visible" variants={pageVariants}>
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manajemen Pesanan</h1>
          <p className="text-muted-foreground">
            Lihat dan kelola semua pesanan yang masuk.
          </p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
              <div className="flex justify-between items-center">
                  <div>
                      <CardTitle>Daftar Pesanan</CardTitle>
                      <CardDescription>
                          Total {meta?.total || 0} pesanan. Halaman {meta?.page || 1} dari {meta?.lastPage || 1}.
                      </CardDescription>
                  </div>
                  <div className="relative w-full max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                          placeholder="Cari No. Order, Nama, atau Email..."
                          className="pl-9"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                      />
                  </div>
              </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <AnimatePresence mode="wait">
                <motion.tbody
                  key={`${page}-${debouncedSearchTerm}`}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
                >
                  {isLoading && (
                    <motion.tr variants={itemVariants}>
                        <TableCell colSpan={6} className="text-center h-24">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground"/>
                        </TableCell>
                    </motion.tr>
                  )}
                  {isError && (
                    <motion.tr variants={itemVariants}>
                        <TableCell colSpan={6} className="text-center h-24 text-red-500">
                            Gagal memuat data: {error.message}
                        </TableCell>
                    </motion.tr>
                  )}
                  
                  {orders && orders.length > 0 ? (
                    orders.map((order) => (
                      <motion.tr key={order.id} variants={itemVariants}>
                        <TableCell className="font-mono text-xs">{order.orderNumber}</TableCell>
                        <TableCell>{formatDate(order.createdAt)}</TableCell>
                        <TableCell className="font-medium">{order.user.name}</TableCell>
                        <TableCell>{formatPrice(order.totalAmount)}</TableCell>
                        <TableCell>
                           <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                              order.status === 'PROCESSING' ? 'bg-orange-100 text-orange-800' :
                              order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-800' :
                              order.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' :
                              order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {order.status}
                            </span>
                        </TableCell>
                        <TableCell className="text-right">
                           <Button variant="outline" size="sm" asChild>
                               <Link href={`/orders/${order.id}`}> 
                                   <Eye className="mr-2 h-4 w-4" /> Lihat
                               </Link>
                           </Button>
                        </TableCell>
                      </motion.tr>
                    ))
                  ) : (
                    !isLoading && (
                        <motion.tr variants={itemVariants}>
                            <TableCell colSpan={6} className="text-center h-24">Pesanan tidak ditemukan.</TableCell>
                        </motion.tr>
                    )
                  )}
                </motion.tbody>
              </AnimatePresence>
            </Table>

            {meta && meta.lastPage > 1 && (
              <div className="flex items-center justify-end space-x-2 pt-4">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1 || isLoading}>
                  <ChevronLeft className="h-4 w-4" />
                  <span>Sebelumnya</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === meta.lastPage || isLoading}>
                  <span>Berikutnya</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

          </CardContent>
        </Card>
      </motion.div>
    </motion.div> // <-- Perbaikan di sini, dari </div> menjadi </motion.div>
  );
}