// pages/categories/index.tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { PlusCircle, MoreHorizontal, Edit, Trash2, ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { getCategories, deleteCategory, Category } from '../services/categoryService';

export default function CategoriesPage() {
  const queryClient = useQueryClient();

  const { data: categories, isLoading, isError, error } = useQuery<Category[], Error>({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Kategori berhasil dihapus.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menghapus kategori.');
    },
  });

  const handleDelete = (id: string) => {
    if (window.confirm('Anda yakin ingin menghapus kategori ini?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Kategori</h1>
          <p className="text-muted-foreground">Kelola semua kategori produk Anda di sini.</p>
        </div>
        <Button asChild>
          <Link href="/categories/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Tambah Kategori
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Kategori</CardTitle>
          <CardDescription>Total {categories?.length || 0} kategori ditemukan.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {/* 👇 **START OF CHANGES** 👇 */}
                <TableHead className="w-[100px]">Gambar</TableHead>
                <TableHead>Nama Kategori</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
                {/* 👆 **END OF CHANGES** 👆 */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={3} className="text-center h-24">Memuat data...</TableCell></TableRow>}
              {isError && <TableRow><TableCell colSpan={3} className="text-center h-24 text-red-500">Gagal memuat data: {error.message}</TableCell></TableRow>}
              
              {categories && categories.length > 0 ? (
                categories.map((category) => (
                  <TableRow key={category.id}>
                    {/* 👇 **START OF CHANGES** 👇 */}
                    <TableCell>
                      {category.imageUrl ? (
                        <img src={category.imageUrl} alt={category.name} className="h-12 w-12 object-cover rounded-md bg-gray-100" />
                      ) : (
                        <div className="h-12 w-12 flex items-center justify-center bg-gray-100 rounded-md text-gray-400">
                          <ImageIcon size={24} />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    {/* 👆 **END OF CHANGES** 👆 */}
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/categories/edit?id=${category.id}`}><Edit className="mr-2 h-4 w-4" /><span>Edit</span></Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => handleDelete(category.id)}>
                            <Trash2 className="mr-2 h-4 w-4" /><span>Hapus</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                !isLoading && <TableRow><TableCell colSpan={3} className="text-center h-24">Belum ada kategori.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}