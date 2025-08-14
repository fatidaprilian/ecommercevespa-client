// pages/brands/new.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
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
import { createBrand } from '../services/brandService';

// Skema validasi untuk form merek
const brandFormSchema = z.object({
  name: z.string().min(2, { message: 'Nama merek minimal 2 karakter.' }),
  logoUrl: z.string().url({ message: 'URL logo tidak valid.' }).optional().or(z.literal('')),
});

type BrandFormValues = z.infer<typeof brandFormSchema>;

export default function NewBrandPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandFormSchema),
    defaultValues: {
      name: '',
      logoUrl: '',
    },
  });

  const mutation = useMutation({
    mutationFn: createBrand,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      toast.success('Merek baru berhasil dibuat!');
      router.push('/brands');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Gagal membuat merek.';
      toast.error(errorMessage);
    },
  });

  function onSubmit(values: BrandFormValues) {
    const dataToSend = {
      name: values.name,
      ...(values.logoUrl && { logoUrl: values.logoUrl }),
    };
    mutation.mutate(dataToSend);
  }

  const isLoading = mutation.isPending;

  return (
    <div>
      <div className="mb-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/brands">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Daftar Merek
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tambah Merek Baru</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Merek</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: Vespa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo URL (Opsional)</FormLabel>
                    <FormControl>
                      <Input placeholder="http://example.com/logo.png" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Menyimpan...' : 'Simpan Merek'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}