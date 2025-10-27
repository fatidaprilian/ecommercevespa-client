'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { toast } from 'sonner';
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
import { getCategoryById, updateCategory, deleteCategory, CategoryData } from '@/services/categoryService';

const categoryFormSchema = z.object({
  name: z.string().min(3, { message: 'Nama kategori minimal 3 karakter.' }),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export default function EditCategoryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = router.query;
  const categoryId = typeof id === 'string' ? id : '';

  const { data: category, isLoading: isLoadingQuery, isError } = useQuery({
    queryKey: ['category', categoryId],
    queryFn: () => getCategoryById(categoryId),
    enabled: !!categoryId,
  });

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: '',
    },
  });

  useEffect(() => {
    if (category) {
      form.reset({
        name: category.name,
      });
    }
  }, [category, form]);

  const updateMutation = useMutation({
    mutationFn: (values: CategoryFormValues) => updateCategory(categoryId, values as CategoryData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['category', categoryId] });
      toast.success('Data berhasil disimpan!');
      router.push('/categories');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Gagal memperbarui kategori.';
      toast.error(errorMessage);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCategory(categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Kategori berhasil dihapus.');
      router.push('/categories');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Gagal menghapus kategori.';
      toast.error(errorMessage);
    },
  });

  const onSubmit = (values: CategoryFormValues) => {
    updateMutation.mutate(values);
  };

  const handleDelete = () => {
    if (window.confirm('Anda yakin ingin menghapus kategori ini?')) {
      deleteMutation.mutate();
    }
  };

  if (isLoadingQuery) return <p className="text-center p-4">Memuat data kategori...</p>;
  if (isError) return <p className="text-center p-4 text-red-500">Kategori tidak ditemukan atau gagal dimuat.</p>;

  const isProcessing = updateMutation.isPending || deleteMutation.isPending;

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
                      <Input {...field} disabled={isProcessing} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* FormField imageUrl sudah dihapus */}

              <div className="flex justify-between items-center pt-4">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isProcessing}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {deleteMutation.isPending ? 'Menghapus...' : 'Hapus'}
                </Button>
                <Button type="submit" disabled={isProcessing}>
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