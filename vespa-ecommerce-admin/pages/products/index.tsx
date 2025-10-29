// pages/products/index.tsx

import { useState, useEffect, useRef } from 'react'; // <-- MODIFIKASI: Tambahkan useEffect dan useRef
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getProducts, updateProduct, deleteProduct, PaginatedProducts } from '@/services/productService';
import { Switch } from '@/components/ui/switch';
import { toast } from "sonner";
import { Product } from '@/services/productService'; // Menggunakan tipe dari service

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

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
  const queryClient = useQueryClient();

  // <-- TAMBAHAN: ref untuk melacak mount awal
  const isInitialMount = useRef(true);

  const { data: productsResponse, isLoading, isError, error } = useQuery<PaginatedProducts, Error>({
    queryKey: ['products', page, debouncedSearchTerm],
    queryFn: () => getProducts({ page, search: debouncedSearchTerm }),
    keepPreviousData: true,
  });

  // <-- TAMBAHAN: useEffect untuk reset halaman saat search
  useEffect(() => {
    // Jangan reset halaman saat komponen pertama kali mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      // Jika search term berubah (dan bukan mount awal),
      // reset ke halaman 1
      if (page !== 1) {
        setPage(1);
      }
    }
  }, [debouncedSearchTerm]); // <-- Dependensi HANYA pada debouncedSearchTerm

  const products = productsResponse?.data;
  const meta = productsResponse?.meta;

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) => updateProduct(id, data),
    onSuccess: (updatedProduct) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(`Produk "${updatedProduct.name}" telah diperbarui.`);
    },
    onError: (error: any) => {
      toast.error("Gagal Memperbarui Status", {
        description: error.response?.data?.message || 'Terjadi kesalahan tidak diketahui.',
      });
    },
  });
  
  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
        toast.success('Produk berhasil dihapus.');
        queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: any) => {
        toast.error("Gagal Menghapus Produk", {
            description: error.response?.data?.message || 'Terjadi kesalahan.',
        });
    }
  });

  const handleFeatureToggle = (product: Product) => {
    updateProductMutation.mutate({
      id: product.id,
      data: { isFeatured: !product.isFeatured },
    });
  };

  const handleDelete = (id: string) => {
    // Ganti window.confirm dengan dialog kustom jika ada, 
    // tapi untuk sekarang ini fungsional
    if (window.confirm('Anda yakin ingin menghapus produk ini? Tindakan ini tidak dapat dibatalkan.')) {
        deleteMutation.mutate(id);
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={pageVariants}
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manajemen Produk</h1>
          <p className="text-muted-foreground">
            Kelola semua produk yang ada di toko Anda.
          </p>
        </div>
        <Button asChild>
          <Link href="/products/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Tambah Produk
          </Link>
        </Button>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card>
            <CardHeader>
                <CardTitle>Daftar Produk</CardTitle>
                <div className="flex justify-between items-center pt-2">
                    <CardDescription>
                        Total {meta?.total || 0} produk ditemukan. Halaman {meta?.page || 1} dari {meta?.lastPage || 1}.
                    </CardDescription>
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Cari nama atau SKU produk..."
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
                      <TableHead className="w-[80px]">Unggulan</TableHead>
                      <TableHead>Nama Produk</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Harga</TableHead>
                      <TableHead>Stok</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <AnimatePresence mode="wait">
                    <motion.tbody
                      key={`${page}-${debouncedSearchTerm}`}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      variants={{
                        visible: { transition: { staggerChildren: 0.05 } },
                      }}
                    >
                      {isLoading ? (
                          <motion.tr variants={itemVariants}>
                              <TableCell colSpan={6} className="text-center h-24">
                                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                              </TableCell>
                          </motion.tr>
                      ) : isError ? (
                          <motion.tr variants={itemVariants}>
                              <TableCell colSpan={6} className="text-center h-24 text-red-500">{error.message}</TableCell>
                          </motion.tr>
                      ) : products?.length > 0 ? (
                          products.map((product) => (
                              <motion.tr key={product.id} variants={itemVariants}>
                                <TableCell>
                                  <Switch
                                    checked={product.isFeatured}
                                    onCheckedChange={() => handleFeatureToggle(product)}
                                    disabled={updateProductMutation.isPending}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">{product.name}</TableCell>
                                <TableCell>{product.sku}</TableCell>
                                <TableCell>Rp{product.price.toLocaleString('id-ID')}</TableCell>
                                <TableCell>{product.stock}</TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" className="h-8 w-8 p-0">
                                          <span className="sr-only">Buka menu</span>
                                          <MoreHorizontal className="h-4 w-4" />
                                          </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                          <DropdownMenuItem asChild>
                                          <Link href={`/products/edit?id=${product.id}`}>
                                              <Edit className="mr-2 h-4 w-4" />
                                              <span>Edit</span>
                                          </Link>
                                          </DropdownMenuItem>
                                          <DropdownMenuItem 
                                            className="text-red-600 focus:text-red-600"
                                            onClick={() => handleDelete(product.id)}
                                            disabled={deleteMutation.isPending}
                                          >
                                              <Trash2 className="mr-2 h-4 w-4" />
                                              <span>Hapus</span>
                                          </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                              </motion.tr>
                          ))
                      ) : (
                          <motion.tr variants={itemVariants}>
                              <TableCell colSpan={6} className="text-center h-24">
                                  Produk tidak ditemukan.
                              </TableCell>
                          </motion.tr>
                      )}
                    </motion.tbody>
                  </AnimatePresence>
                </Table>
                
                {meta && meta.lastPage > 1 && (
                    <div className="flex items-center justify-end space-x-2 pt-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(p - 1, 1))}
                            disabled={page === 1 || isLoading}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            <span>Sebelumnya</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => p + 1)}
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

