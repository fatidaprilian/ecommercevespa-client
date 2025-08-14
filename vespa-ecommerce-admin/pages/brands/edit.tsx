// vespa-ecommerce-admin/pages/brands/edit.tsx
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
import { getBrandById, updateBrand, deleteBrand, BrandData } from '../services/brandService';

const brandFormSchema = z.object({
  name: z.string().min(2, { message: 'Nama merek minimal 2 karakter.' }),
  logoUrl: z.string().url({ message: 'URL logo tidak valid.' }).optional().or(z.literal('')),
});

type BrandFormValues = z.infer<typeof brandFormSchema>;

export default function EditBrandPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = router.query;
  const brandId = typeof id === 'string' ? id : '';

  const { data: brand, isLoading, isError } = useQuery({
    queryKey: ['brand', brandId],
    queryFn: () => getBrandById(brandId),
    enabled: !!brandId,
  });

  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandFormSchema),
    defaultValues: {
      name: '',
      logoUrl: '',
    },
  });

  useEffect(() => {
    if (brand) {
      form.reset({
        name: brand.name,
        logoUrl: brand.logoUrl || '',
      });
    }
  }, [brand, form]);

  const updateMutation = useMutation({
    mutationFn: (values: BrandFormValues) => updateBrand(brandId, values as BrandData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      toast.success('Merek berhasil diperbarui!');
      router.push('/brands');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal memperbarui merek.');
    },
  });
  
  const deleteMutation = useMutation({
    mutationFn: () => deleteBrand(brandId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      toast.success('Merek berhasil dihapus.');
      router.push('/brands');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal menghapus merek.');
    },
  });

  const onSubmit = (values: BrandFormValues) => {
    // PERBAIKAN: Buat objek data baru yang akan dikirim ke API
    const dataToSend: BrandData = {
      name: values.name,
    };
    // Hanya sertakan logoUrl jika nilainya tidak kosong
    if (values.logoUrl) {
      dataToSend.logoUrl = values.logoUrl;
    }

    updateMutation.mutate(dataToSend);
  };
  
  const handleDelete = () => {
    if (window.confirm('Anda yakin ingin menghapus merek ini secara permanen?')) {
      deleteMutation.mutate();
    }
  };

  if (isLoading) return <p className="text-center p-4">Memuat data merek...</p>;
  if (isError) return <p className="text-center p-4 text-red-500">Merek tidak ditemukan.</p>;

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" asChild>
        <Link href="/brands">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali ke Daftar Merek
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Edit Merek</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Merek</FormLabel>
                    <FormControl>
                      <Input placeholder="Nama merek baru" {...field} />
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
                    <FormLabel>URL Logo (Opsional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/logo.png" {...field} />
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