import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';

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
import { getCategories, Category } from '../services/categoryService'; // Impor fungsi dan tipe

export default function CategoriesPage() {
  // Menggunakan useQuery untuk mengambil data kategori
  const { data: categories, isLoading, isError, error } = useQuery<Category[], Error>({
    queryKey: ['categories'], // Kunci unik untuk query ini
    queryFn: getCategories,    // Fungsi yang akan dijalankan untuk fetch data
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Kategori</h1>
          <p className="text-muted-foreground">
            Lihat dan kelola semua kategori produk Anda di sini.
          </p>
        </div>
        <Button asChild>
          <Link href="/categories/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Tambah Kategori
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Kategori</CardTitle>
          <CardDescription>
            Total {categories?.length || 0} kategori ditemukan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">No</TableHead>
                <TableHead>Nama Kategori</TableHead>
                <TableHead className="w-[200px]">ID</TableHead>
                <TableHead className="text-right w-[150px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
                    Memuat data...
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24 text-red-500">
                    Gagal memuat data: {error.message}
                  </TableCell>
                </TableRow>
              ) : categories && categories.length > 0 ? (
                categories.map((category, index) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{category.name}</TableCell>
                    <TableCell className="text-muted-foreground">{category.id}</TableCell>
                    <TableCell className="text-right">
                      {/* Tombol Aksi (Edit/Hapus) bisa ditambahkan di sini nanti */}
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
                    Belum ada kategori.
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