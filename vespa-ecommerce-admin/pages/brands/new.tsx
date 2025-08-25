'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowLeft, UploadCloud, X } from 'lucide-react';
import { useState } from 'react';

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
import { createBrand, BrandData } from '@/services/brandService';
import { uploadImage } from '@/services/productService';

const brandFormSchema = z.object({
  name: z.string().min(2, { message: 'Nama merek minimal 2 karakter.' }),
  logoUrl: z.string().optional(),
});

type BrandFormValues = z.infer<typeof brandFormSchema>;

export default function NewBrandPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandFormSchema),
    defaultValues: {
      name: '',
      logoUrl: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: BrandData) => createBrand(data),
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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading('Mengunggah logo...');

    try {
      const response = await uploadImage(file);
      form.setValue('logoUrl', response.url, { shouldValidate: true });
      toast.success('Logo berhasil diunggah!', { id: toastId });
    } catch (error) {
      toast.error('Gagal mengunggah logo.', { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    form.setValue('logoUrl', '', { shouldValidate: true });
  };

  function onSubmit(values: BrandFormValues) {
    mutation.mutate(values);
  }

  const isLoading = mutation.isPending;
  const logoUrlValue = form.watch('logoUrl');

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" asChild>
        <Link href="/brands">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali ke Daftar Merek
        </Link>
      </Button>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Merek</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Merek</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: Vespa" {...field} disabled={isLoading || isUploading} />
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
                    <FormLabel>Logo Merek</FormLabel>
                    <FormControl>
                      <>
                        {logoUrlValue ? (
                          <div className="relative w-40 h-40 group">
                            <img src={logoUrlValue} alt="Logo preview" className="w-full h-full object-contain rounded-md border p-2" />
                            <button
                              type="button"
                              onClick={removeImage}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              disabled={isUploading}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent">
                            <UploadCloud className="w-10 h-10 text-muted-foreground mb-2" />
                            <span className="text-sm text-muted-foreground">Klik untuk mengunggah</span>
                            <Input
                              type="file"
                              className="hidden"
                              onChange={handleImageUpload}
                              disabled={isUploading}
                              accept="image/png, image/jpeg, image/webp, image/svg+xml"
                            />
                          </label>
                        )}
                      </>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading || isUploading}>
              {isLoading ? 'Menyimpan...' : 'Simpan Merek'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}