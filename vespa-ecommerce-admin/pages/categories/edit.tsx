// vespa-ecommerce-admin/pages/categories/[id].tsx
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowLeft, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCategoryById, updateCategory, deleteCategory } from '../services/categoryService';

const categoryFormSchema = z.object({
  name: z.string().min(3, { message: 'Nama kategori minimal 3 karakter.' }),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export default function EditCategoryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = router.query;
  const categoryId = typeof id === 'string' ? id : '';

  // 1. Mengambil data kategori berdasarkan ID dari URL
  const { data: category, isLoading, isError } = useQuery({
    queryKey: ['category', categoryId],
    queryFn: () => getCategoryById(categoryId),
    enabled: !!categoryId, // Hanya jalankan query jika categoryId sudah ada
  });

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: '',
    },
  });

  // 2. Mengisi form dengan data yang berhasil diambil
  useEffect(() => {
    if (category) {
      form.reset({ name: category.name });
    }
  }, [category, form]);

  // 3. Mutasi untuk menyimpan perubahan
  const updateMutation = useMutation({
    mutationFn: (values: CategoryFormValues) => updateCategory(categoryId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['category', categoryId] });
      toast.success('Kategori berhasil diperbarui!');
      router.push('/categories');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal memperbarui kategori.');
    },
  });
  
  // 4. Mutasi untuk menghapus kategori
  const deleteMutation = useMutation({
    mutationFn: () => deleteCategory(categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Kategori berhasil dihapus.');
      router.push('/categories');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal menghapus kategori.');
    },
  });

  const onSubmit = (values: CategoryFormValues) => {
    updateMutation.mutate(values);
  };
  
  const handleDelete = () => {
    if (window.confirm('Anda yakin ingin menghapus kategori ini secara permanen?')) {
      deleteMutation.mutate();
    }
  };

  if (isLoading) return <p className="text-center p-4">Memuat kategori...</p>;
  if (isError) return <p className="text-center p-4 text-red-500">Kategori tidak ditemukan.</p>;

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" asChild>
        <Link href="/categories">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali ke Daftar Kategori
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Edit Kategori</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Kategori</FormLabel>
                    <FormControl>
                      <Input placeholder="Nama kategori baru" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-between items-center">
                <Button 
                  type="button" 
                  variant="destructive" 
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {deleteMutation.isPending ? 'Menghapus...' : 'Hapus'}
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
