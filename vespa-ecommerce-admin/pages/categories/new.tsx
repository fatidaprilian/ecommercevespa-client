// Ganti path file ini sesuai dengan struktur proyek Anda
// contoh: /admin/app/categories/new/page.tsx

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';

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
import { createCategory } from '../services/categoryService';

// Skema validasi untuk form kategori
const categoryFormSchema = z.object({
  name: z.string().min(3, { message: 'Nama kategori minimal 3 karakter.' }),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export default function NewCategoryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: '',
    },
  });

  const mutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Kategori baru berhasil dibuat!');
      router.push('/categories');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Gagal membuat kategori.';
      toast.error(errorMessage);
    },
  });

  function onSubmit(values: CategoryFormValues) {
    mutation.mutate(values);
  }

  // Cek status loading dari mutasi
  const isLoading = mutation.isPending;

  return (
    <div>
      <div className="mb-4">
        <Button variant="outline" size="sm" asChild>
          {/* Arahkan ke halaman daftar kategori yang benar */}
          <Link href="/categories">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Daftar Kategori
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tambah Kategori Baru</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="name" // Prop ini sudah benar
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Kategori</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: Aksesoris" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Menyimpan...' : 'Simpan Kategori'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}