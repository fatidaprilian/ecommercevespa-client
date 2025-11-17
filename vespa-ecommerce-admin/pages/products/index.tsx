// pages/products/index.tsx

import { useState, useEffect, useMemo } from 'react'; // <-- useMemo ditambahkan
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { 
  PlusCircle, MoreHorizontal, Edit, Trash2, Search, 
  ChevronLeft, ChevronRight, Loader2, RefreshCw, 
  CheckCircle, XCircle, Package, Tag,
  EyeOff, // <-- Icon baru
  Eye, // <-- Icon baru
  X // <-- Icon baru untuk Batal
} from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from "sonner";

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox'; // <-- Pastikan ini ada

import { 
  getProducts, 
  updateProduct, 
  deleteProduct, 
  PaginatedProducts, 
  Product,
  bulkUpdateProductVisibility // <-- Pastikan ini ada
} from '@/services/productService';

// --- Framer Motion Variants (Sama seperti UsersPage) ---
const pageVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { ease: 'easeOut', duration: 0.4 } },
  exit: { opacity: 0, transition: { ease: 'easeIn', duration: 0.2 } },
};

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
  const [activeTab, setActiveTab] = useState<"active" | "inactive">("active");
  
  // --- STATE UNTUK BULK ACTION (Sekarang Persisten) ---
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  // --- END ---

  const queryClient = useQueryClient();
  const [isSyncingRules, setIsSyncingRules] = useState(false);

  // Query data produk berdasarkan activeTab
  const { data: productsResponse, isLoading, isError, error } = useQuery<PaginatedProducts, Error>({
    queryKey: ['products', page, debouncedSearchTerm, activeTab],
    queryFn: () => getProducts({ 
        page, 
        search: debouncedSearchTerm,
        isVisible: activeTab === 'active' 
    }),
    placeholderData: (previousData) => previousData,
  });

  // Reset halaman ke 1 saat search term berubah
  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm]);

  // !! EFEK YANG MERESET SELEKSI TELAH DIHAPUS !!

  const products = productsResponse?.data || [];
  const meta = productsResponse?.meta;

  // --- HELPERS BARU UNTUK SELEKSI (HANYA MEMPENGARUHI HALAMAN SAAT INI) ---
  const currentPageIds = useMemo(() => products.map((p) => p.id), [products]);
  const isAllPageSelected = useMemo(() => {
    if (currentPageIds.length === 0) return false;
    // Cek apakah semua ID di halaman ini ada di dalam state seleksi
    return currentPageIds.every((id) => selectedProductIds.includes(id));
  }, [currentPageIds, selectedProductIds]);
  // --- END ---

  // Mutation untuk Update (Featured / Visibility)
  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) => updateProduct(id, data),
    onSuccess: (updatedProduct) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(`Produk "${updatedProduct.name}" diperbarui.`);
    },
    onError: (error: any) => {
      toast.error("Gagal Memperbarui", {
        description: error.response?.data?.message || 'Terjadi kesalahan.',
      });
    },
  });
  
  // Mutation untuk Hard Delete
  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
        toast.success('Produk berhasil dihapus.');
        queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: any) => {
        toast.error("Gagal Menghapus", {
            description: error.response?.data?.message || 'Terjadi kesalahan.',
        });
    }
  });

  // Mutation untuk BULK UPDATE VISIBILITY
  const bulkUpdateVisibilityMutation = useMutation({
    mutationFn: bulkUpdateProductVisibility,
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setSelectedProductIds([]); // Kosongkan pilihan HANYA setelah sukses
    },
    onError: (error: any) => {
      toast.error("Gagal Memperbarui Produk", {
        description: error.response?.data?.message || 'Terjadi kesalahan.',
      });
    },
  });
  // --- END ---

  // Mutation untuk Sync Harga Accurate
  const handleSyncRules = async () => {
    if (!confirm('Yakin ingin menyinkronkan aturan harga dari Accurate?')) return;
    setIsSyncingRules(true);
    try {
      const response = await api.post('/accurate-sync/sync-rules');
      toast.success('Sinkronisasi Berhasil', {
        description: `Berhasil menyinkronkan ${response.data.synced || 0} aturan.`,
      });
    } catch (error: any) {
      toast.error('Sinkronisasi Gagal', {
        description: error.response?.data?.message || 'Terjadi kesalahan.',
      });
    } finally {
      setIsSyncingRules(false);
    }
  };

  const handleFeatureToggle = (product: Product) => {
    updateProductMutation.mutate({ id: product.id, data: { isFeatured: !product.isFeatured } });
  };

  const handleVisibilityToggle = (product: Product) => {
      const newVisibility = !product.isVisible;
      updateProductMutation.mutate({ id: product.id, data: { isVisible: newVisibility } });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Yakin ingin menghapus produk ini secara permanen?')) {
        deleteMutation.mutate(id);
    }
  };

  // --- HANDLER SELEKSI BARU (LEBIH PINTAR) ---
  const handleSelectAll = () => {
    if (isAllPageSelected) {
      // Jika semua di halaman ini sudah terpilih, deselect HANYA halaman ini
      setSelectedProductIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
    } else {
      // Jika belum, select semua di halaman ini (tambahkan ke state, hindari duplikat)
      setSelectedProductIds((prev) => [...new Set([...prev, ...currentPageIds])]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id)
        ? prev.filter((pid) => pid !== id) // Hapus
        : [...prev, id], // Tambah
    );
  };
  
  // HANDLER TOMBOL BATAL
  const handleClearSelection = () => {
    setSelectedProductIds([]);
  };

  // HANDLER TOMBOL BULK ACTION
  const handleBulkAction = (isVisible: boolean) => {
    const actionText = isVisible ? 'aktifkan' : 'sembunyikan';
    if (!confirm(`Yakin ingin ${actionText} ${selectedProductIds.length} produk yang dipilih?`)) {
      return;
    }
    bulkUpdateVisibilityMutation.mutate({
      productIds: selectedProductIds,
      isVisible,
    });
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={pageVariants} className="space-y-6">
      {/* Header Section */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manajemen Produk</h1>
          <p className="text-muted-foreground">Kelola katalog, harga, dan stok produk Anda.</p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* --- REVISI TOMBOL BULK ACTION DENGAN TOMBOL BATAL --- */}
            {selectedProductIds.length > 0 && (
              <AnimatePresence>
                <motion.div 
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto', transition: { duration: 0.3 } }}
                  exit={{ opacity: 0, width: 0, transition: { duration: 0.2 } }}
                  className="flex items-center gap-2 overflow-hidden"
                >
                  {/* TAMPILKAN TOMBOL HIDE HANYA JIKA DI TAB AKTIF */}
                  {activeTab === 'active' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkAction(false)}
                      disabled={bulkUpdateVisibilityMutation.isPending}
                      className="text-orange-600 border-orange-600 hover:bg-orange-50 hover:text-orange-700"
                    >
                      {bulkUpdateVisibilityMutation.isPending && !bulkUpdateVisibilityMutation.variables?.isVisible ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <EyeOff className="mr-2 h-4 w-4" />
                      )}
                      Hide Selected ({selectedProductIds.length})
                    </Button>
                  )}
                  
                  {/* TAMPILKAN TOMBOL UNHIDE HANYA JIKA DI TAB NON-AKTIF */}
                  {activeTab === 'inactive' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkAction(true)}
                      disabled={bulkUpdateVisibilityMutation.isPending}
                      className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700"
                    >
                      {bulkUpdateVisibilityMutation.isPending && bulkUpdateVisibilityMutation.variables?.isVisible ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Eye className="mr-2 h-4 w-4" />
                      )}
                      Unhide Selected ({selectedProductIds.length})
                    </Button>
                  )}

                  {/* TOMBOL BATAL BARU */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSelection}
                    className="text-muted-foreground"
                    title="Batalkan semua pilihan"
                  >
                     <X className="mr-1 h-4 w-4" /> Batal ({selectedProductIds.length})
                  </Button>

                </motion.div>
              </AnimatePresence>
            )}
            {/* --- END REVISI TOMBOL BULK ACTION --- */}

            <Button onClick={handleSyncRules} disabled={isSyncingRules} variant="outline" size="sm">
              {isSyncingRules ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Sync Harga
            </Button>
            <Button asChild size="sm">
              <Link href="/products/new"><PlusCircle className="mr-2 h-4 w-4" /> Tambah Produk</Link>
            </Button>
        </div>
      </motion.div>

      {/* Tabs & Table Section */}
      <motion.div variants={itemVariants}>
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as "active" | "inactive"); setPage(1); }} className="w-full">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <TabsList>
                    <TabsTrigger value="active">Produk Aktif</TabsTrigger>
                    <TabsTrigger value="inactive">Produk Non-Aktif</TabsTrigger>
                </TabsList>

                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari nama atau SKU..."
                        className="pl-8 h-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <TabsContent value="active">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle>Daftar Produk Aktif</CardTitle>
                        <CardDescription>
                            Menampilkan {meta?.total || 0} produk yang terlihat oleh pelanggan.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 sm:p-6 sm:pt-0">
                        <ProductTable 
                            products={products}
                            isLoading={isLoading}
                            isError={isError}
                            error={error}
                            activeTab="active"
                            meta={meta}
                            page={page}
                            setPage={setPage}
                            onFeatureToggle={handleFeatureToggle}
                            onVisibilityToggle={handleVisibilityToggle}
                            onDelete={handleDelete}
                            isMutationPending={updateProductMutation.isPending || deleteMutation.isPending || bulkUpdateVisibilityMutation.isPending}
                            // --- PROPS SELEKSI BARU ---
                            selectedProductIds={selectedProductIds}
                            onSelectAll={handleSelectAll}
                            onSelectRow={handleSelectRow}
                            isAllSelected={isAllPageSelected} // <-- Kirim status halaman ini
                            // --- END ---
                        />
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="inactive">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle>Daftar Produk Non-Aktif</CardTitle>
                        <CardDescription>
                            Menampilkan {meta?.total || 0} produk yang disembunyikan dari katalog.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 sm:p-6 sm:pt-0">
                        <ProductTable 
                            products={products}
                            isLoading={isLoading}
                            isError={isError}
                            error={error}
                            activeTab="inactive"
                            meta={meta}
                            page={page}
                            setPage={setPage}
                            onFeatureToggle={handleFeatureToggle}
                            onVisibilityToggle={handleVisibilityToggle}
                            onDelete={handleDelete}
                            isMutationPending={updateProductMutation.isPending || deleteMutation.isPending || bulkUpdateVisibilityMutation.isPending}
                            // --- PROPS SELEKSI BARU ---
                            selectedProductIds={selectedProductIds}
                            onSelectAll={handleSelectAll}
                            onSelectRow={handleSelectRow}
                            isAllSelected={isAllPageSelected} // <-- Kirim status halaman ini
                            // --- END ---
                        />
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}

// --- Komponen Tabel Terpisah (Lebih Rapi & Smooth) ---

interface ProductTableProps {
    products: Product[];
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    activeTab: "active" | "inactive";
    meta: any;
    page: number;
    setPage: (page: number) => void;
    onFeatureToggle: (product: Product) => void;
    onVisibilityToggle: (product: Product) => void;
    onDelete: (id: string) => void;
    isMutationPending: boolean;
    // --- PROPS SELEKSI (Nama tetap sama) ---
    selectedProductIds: string[];
    onSelectAll: () => void;
    onSelectRow: (id: string) => void;
    isAllSelected: boolean;
    // --- END ---
}

function ProductTable({
    products, isLoading, isError, error, activeTab, meta, page, setPage,
    onFeatureToggle, onVisibilityToggle, onDelete, isMutationPending,
    // --- PROPS SELEKSI ---
    selectedProductIds, onSelectAll, onSelectRow, isAllSelected
    // --- END ---
}: ProductTableProps) {
    const isInactiveView = activeTab === 'inactive';

    return (
        <>
            <div className="rounded-md border overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            {/* --- CHECKBOX HEADER --- */}
                            <TableHead className="w-[40px] px-4">
                              <Checkbox
                                checked={isAllSelected}
                                onCheckedChange={onSelectAll}
                                aria-label="Select all on this page"
                                disabled={isLoading || products.length === 0}
                              />
                            </TableHead>
                            {/* --- END --- */}
                            <TableHead className="w-[80px] text-center">Unggulan</TableHead>
                            <TableHead>Info Produk</TableHead>
                            <TableHead className="hidden md:table-cell">Kategori</TableHead>
                            <TableHead>Harga</TableHead>
                            <TableHead>Stok</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right pr-4">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <AnimatePresence mode="wait">
                        <motion.tbody
                            key={page + activeTab + (isLoading ? 'loading' : 'loaded')} // Kunci di-update agar animasi lebih baik
                            initial="hidden" animate="visible" exit="exit"
                            variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
                        >
                            {isLoading ? (
                                <TableRow><TableCell colSpan={8} className="h-32 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></TableCell></TableRow>
                            ) : isError ? (
                                <TableRow><TableCell colSpan={8} className="h-32 text-center text-red-500">{error?.message || "Terjadi kesalahan"}</TableCell></TableRow>
                            ) : products.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Package className="h-8 w-8 opacity-50" />
                                            <p>Tidak ada produk {isInactiveView ? 'non-aktif' : 'aktif'} ditemukan.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                products.map((product) => (
                                    <motion.tr 
                                      key={product.id} 
                                      variants={itemVariants} 
                                      className="group"
                                      // Terapkan style 'selected' jika ID ada di state
                                      data-state={selectedProductIds.includes(product.id) ? 'selected' : ''}
                                      // Anda bisa tambahkan style di CSS/globals.css:
                                      // .table-row[data-state="selected"] { background-color: theme(colors.blue.50); }
                                    >
                                        {/* --- CHECKBOX ROW --- */}
                                        <TableCell className="px-4">
                                          <Checkbox
                                            checked={selectedProductIds.includes(product.id)}
                                            onCheckedChange={() => onSelectRow(product.id)}
                                            aria-label="Select row"
                                          />
                                        </TableCell>
                                        {/* --- END --- */}
                                        <TableCell className="text-center">
                                            <Switch
                                                checked={product.isFeatured}
                                                onCheckedChange={() => onFeatureToggle(product)}
                                                disabled={isMutationPending || isInactiveView}
                                                aria-label="Toggle unggulan"
                                                className="data-[state=checked]:bg-yellow-500"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium group-hover:text-primary transition-colors">
                                                    {product.name}
                                                </span>
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Tag className="h-3 w-3" /> {product.sku}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            {product.category?.name ? (
                                                <Badge variant="outline">{product.category.name}</Badge>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            Rp{product.price.toLocaleString('id-ID')}
                                        </TableCell>
                                        <TableCell>
                                            <span className={`font-medium ${product.stock <= 5 ? "text-red-600" : "text-green-600"}`}>
                                                {product.stock}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center space-x-2">
                                                <Switch
                                                    id={`visibility-${product.id}`}
                                                    checked={product.isVisible}
                                                    onCheckedChange={() => onVisibilityToggle(product)}
                                                    disabled={isMutationPending}
                                                />
                                                <Label htmlFor={`visibility-${product.id}`} className={`text-xs ${product.isVisible ? 'text-green-600' : 'text-muted-foreground'}`}>
                                                    {product.isVisible ? 'Aktif' : 'Non-Aktif'}
                                                </Label>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-4">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                        <span className="sr-only">Menu</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/products/edit?id=${product.id}`} className="cursor-pointer flex items-center">
                                                            <Edit className="mr-2 h-4 w-4" /> Edit Detail
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    
                                                    {isInactiveView ? (
                                                        <DropdownMenuItem onClick={() => onVisibilityToggle(product)} className="text-green-600 focus:text-green-600 cursor-pointer">
                                                            <CheckCircle className="mr-2 h-4 w-4" /> Aktifkan Kembali
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem onClick={() => onVisibilityToggle(product)} className="text-orange-600 focus:text-orange-600 cursor-pointer">
                                                            <XCircle className="mr-2 h-4 w-4" /> Sembunyikan
                                                        </DropdownMenuItem>
                                                    )}
                                                    
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => onDelete(product.id)} className="text-red-600 focus:text-red-600 cursor-pointer">
                                                        <Trash2 className="mr-2 h-4 w-4" /> Hapus Permanen
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </motion.tr>
                                ))
                            )}
                        </motion.tbody>
                    </AnimatePresence>
                </Table>
            </div>

            {/* Pagination */}
            {meta && meta.lastPage > 1 && (
                <div className="flex items-center justify-between pt-4">
                    <div className="text-sm text-muted-foreground">
                        Halaman {meta.page} dari {meta.lastPage}
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={() => setPage(Math.max(page - 1, 1))} disabled={page === 1 || isLoading}>
                            <ChevronLeft className="h-4 w-4 mr-1" /> Sebelumnya
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setPage(Math.min(page + 1, meta.lastPage))} disabled={page === meta.lastPage || isLoading}>
                            Berikutnya <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </div>
            )}
        </>
    );
}