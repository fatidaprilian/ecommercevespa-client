'use client'; // Pastikan ini ada jika menggunakan App Router

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router'; // Gunakan next/router untuk Pages Router
import Link from 'next/link';
// HAPUS: import toast from 'react-hot-toast';
import { toast } from 'sonner'; // <-- GANTI: Impor dari sonner
import { ArrowLeft } from 'lucide-react';
// Hapus import yang tidak terpakai jika ada (seperti UploadCloud, X, useState)

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
import { createCategory, CategoryData } from '@/services/categoryService'; // Pastikan path ini benar

// Skema tanpa imageUrl (sesuai permintaan awal Anda)
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
    // Pastikan CategoryData di service sesuai dengan data yang dikirim
    mutationFn: (data: CategoryFormValues) => createCategory(data as CategoryData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Data berhasil disimpan!'); // <-- GANTI pesan sukses
      router.push('/categories');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Gagal membuat kategori.';
      // Panggil toast.error dari sonner
      toast.error(errorMessage); // Ini akan menampilkan pesan duplikat dari backend
    },
  });

  function onSubmit(values: CategoryFormValues) {
    mutation.mutate(values);
  }

  const isLoading = mutation.isPending;

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" asChild>
        <Link href="/categories">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali ke Daftar Kategori
        </Link>
      </Button>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Kategori Baru</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Kategori</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: Aksesoris" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* FormField untuk imageUrl sudah dihapus sebelumnya */}
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Menyimpan...' : 'Simpan Kategori'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}