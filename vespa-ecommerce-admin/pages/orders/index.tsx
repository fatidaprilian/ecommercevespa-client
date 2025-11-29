// file: vespa-ecommerce-admin/pages/orders/index.tsx

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Eye, Search, ChevronLeft, ChevronRight, Loader2, MoreHorizontal, Edit } from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { getOrders, Order, PaginatedOrders } from '@/services/orderService';

const pageVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { ease: 'easeOut', duration: 0.4 },
  },
  exit: {
    opacity: 0,
    transition: { ease: 'easeIn', duration: 0.2 },
  },
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(price);
};

export default function OrdersPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

  const {
    data: ordersResponse,
    isLoading,
    isError,
    error,
  } = useQuery<PaginatedOrders, Error>({
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
          <p className="text-muted-foreground">Lihat dan kelola semua pesanan yang masuk.</p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Daftar Pesanan</CardTitle>
                <CardDescription>
                  Total {meta?.total || 0} pesanan. Halaman {meta?.page || 1} dari {meta?.lastPage || 1}.
                </CardDescription>
              </div>
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
            {/* DESKTOP / TABLET (≥ md): tabel asli, tidak diubah */}
            <div className="hidden md:block">
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
                    key={`${page}-${debouncedSearchTerm}-${isLoading ? 'loading' : 'loaded'}`}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
                  >
                    {isLoading && (
                      <motion.tr variants={itemVariants}>
                        <TableCell colSpan={6} className="h-24 text-center">
                          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                        </TableCell>
                      </motion.tr>
                    )}
                    {isError && (
                      <motion.tr variants={itemVariants}>
                        <TableCell colSpan={6} className="h-24 text-center text-red-500">
                          Gagal memuat data: {error?.message}
                        </TableCell>
                      </motion.tr>
                    )}

                    {orders && orders.length > 0 ? (
                      orders.map((order) => (
                        <motion.tr key={order.id} variants={itemVariants}>
                          <TableCell className="font-mono text-xs">
                            <Link href={`/orders/${order.id}`} className="text-blue-600 hover:underline">
                              #{order.orderNumber}
                            </Link>
                          </TableCell>
                          <TableCell>{formatDate(order.createdAt)}</TableCell>
                          <TableCell className="font-medium">{order.user.name}</TableCell>
                          <TableCell>{formatPrice(order.totalAmount)}</TableCell>
                          <TableCell>
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                order.status === 'COMPLETED' || order.status === 'DELIVERED'
                                  ? 'bg-green-100 text-green-800'
                                  : order.status === 'PROCESSING'
                                  ? 'bg-orange-100 text-orange-800'
                                  : order.status === 'SHIPPED'
                                  ? 'bg-blue-100 text-blue-800'
                                  : order.status === 'PENDING' || order.status === 'PAID'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : order.status === 'CANCELLED' || order.status === 'REFUNDED'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {order.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Buka menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => router.push(`/orders/${order.id}`)}>
                                  <Eye className="mr-2 h-4 w-4" /> Lihat Detail
                                </DropdownMenuItem>
                                {/* ### TOMBOL UBAH STATUS DI SINI ### */}
                                <DropdownMenuItem onClick={() => router.push(`/orders/edit-status?id=${order.id}`)}>
                                  <Edit className="mr-2 h-4 w-4" /> Ubah Status
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </motion.tr>
                      ))
                    ) : (
                      !isLoading && !isError && (
                        <motion.tr variants={itemVariants}>
                          <TableCell colSpan={6} className="h-24 text-center">
                            Pesanan tidak ditemukan.
                          </TableCell>
                        </motion.tr>
                      )
                    )}
                  </motion.tbody>
                </AnimatePresence>
              </Table>
            </div>

            {/* MOBILE (< md): card list, logic sama */}
            <div className="space-y-2 md:hidden">
              <AnimatePresence mode="wait">
                {isLoading && (
                  <motion.div
                    variants={itemVariants}
                    className="flex items-center justify-center rounded-md border bg-white py-8"
                  >
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </motion.div>
                )}

                {isError && (
                  <motion.div
                    variants={itemVariants}
                    className="rounded-md border bg-red-50 px-3 py-4 text-sm text-red-600"
                  >
                    Gagal memuat data: {error?.message}
                  </motion.div>
                )}

                {!isLoading && !isError && orders && orders.length > 0 && (
                  <>
                    {orders.map((order) => (
                      <motion.div
                        key={order.id}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="rounded-md border bg-white px-3 py-2 shadow-sm"
                      >
                        {/* Bar atas: order number + status */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-col">
                            <span className="font-mono text-xs text-blue-600">
                              #{order.orderNumber}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {formatDate(order.createdAt)}
                            </span>
                            <span className="mt-1 text-xs font-medium">{order.user.name}</span>
                          </div>
                          <span
                            className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                              order.status === 'COMPLETED' || order.status === 'DELIVERED'
                                ? 'bg-green-100 text-green-800'
                                : order.status === 'PROCESSING'
                                ? 'bg-orange-100 text-orange-800'
                                : order.status === 'SHIPPED'
                                ? 'bg-blue-100 text-blue-800'
                                : order.status === 'PENDING' || order.status === 'PAID'
                                ? 'bg-yellow-100 text-yellow-800'
                                : order.status === 'CANCELLED' || order.status === 'REFUNDED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>

                        {/* Total */}
                        <div className="mt-2 text-xs">
                          <span className="text-muted-foreground">Total:&nbsp;</span>
                          <span className="font-semibold">{formatPrice(order.totalAmount)}</span>
                        </div>

                        {/* Actions */}
                        <div className="mt-2 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-8 text-xs"
                            onClick={() => router.push(`/orders/${order.id}`)}
                          >
                            <Eye className="mr-1 h-3 w-3" />
                            Detail
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-8 text-xs"
                            onClick={() => router.push(`/orders/edit-status?id=${order.id}`)}
                          >
                            <Edit className="mr-1 h-3 w-3" />
                            Ubah Status
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </>
                )}

                {!isLoading && !isError && (!orders || orders.length === 0) && (
                  <motion.div
                    variants={itemVariants}
                    className="rounded-md border bg-white px-3 py-6 text-center text-sm text-muted-foreground"
                  >
                    Pesanan tidak ditemukan.
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {meta && meta.lastPage > 1 && (
              <div className="flex items-center justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1 || isLoading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Sebelumnya</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === meta.lastPage || isLoading}
                >
                  <span>Berikutnya</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
