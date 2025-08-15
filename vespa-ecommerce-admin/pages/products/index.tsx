// file: vespa-ecommerce-admin/pages/products/index.tsx

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { PlusCircle, MoreHorizontal, Edit, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
// --- PERBAIKAN 1: Impor tipe data PaginatedProducts ---
import { getProducts, PaginatedProducts } from '../services/productService'; 

export default function ProductsPage() {
  // --- PERBAIKAN 2: Gunakan tipe PaginatedProducts untuk useQuery ---
  const { data: productsResponse, isLoading, isError, error } = useQuery<PaginatedProducts, Error>({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  // --- PERBAIKAN 3: Ekstrak array produk dan metadata ---
  const products = productsResponse?.data;
  const totalProducts = productsResponse?.meta?.total || 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
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
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Daftar Produk</CardTitle>
            {/* --- PERBAIKAN 4: Gunakan total dari metadata --- */}
            <CardDescription>Total {totalProducts} produk ditemukan.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Produk</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Harga</TableHead>
                  <TableHead>Stok</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center h-24">Memuat...</TableCell></TableRow>
                ) : isError ? (
                  <TableRow><TableCell colSpan={5} className="text-center h-24 text-red-500">{error.message}</TableCell></TableRow>
                ) : (
                  // --- PERBAIKAN 5: Map melalui 'products' (yang sekarang sudah pasti array) ---
                  products?.map((product) => (
                    <TableRow key={product.id}>
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
                            <DropdownMenuItem className="text-red-600 focus:text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Hapus</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {/* Tambahkan kondisi jika tidak ada produk */}
                {!isLoading && !isError && products?.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">
                            Belum ada produk.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}