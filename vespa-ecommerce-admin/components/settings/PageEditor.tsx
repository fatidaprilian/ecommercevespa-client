// components/settings/PageEditor.tsx
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { Loader2, Save, Upload, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';

import api from '@/lib/api';
import { getPageBySlug, updatePage, CmsPage } from '@/services/pageService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const TiptapEditor = dynamic(() => import('@/components/ui/TiptapEditor').then(mod => mod.TiptapEditor), {
  ssr: false,
  loading: () => <div className="flex justify-center items-center h-40 border rounded-md"><Loader2 className="animate-spin" /></div>,
});

const formSchema = z.object({
  title: z.string().min(1, 'Judul tidak boleh kosong'),
  content: z.string().min(1, 'Konten tidak boleh kosong'),
  bannerImageUrl: z.string().optional()
    .or(z.literal(''))
    .transform(value => value === '' ? undefined : value),
});
type FormValues = z.infer<typeof formSchema>;

interface PageEditorProps {
  slug: string;
  pageTitle: string;
  pageDescription: string;
}

export default function PageEditor({ slug, pageTitle, pageDescription }: PageEditorProps) {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  const { data: page, isLoading } = useQuery<CmsPage, Error>({
    queryKey: ['cms-page', slug],
    queryFn: () => getPageBySlug(slug),
    enabled: !!slug,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: '', content: '', bannerImageUrl: '' }
  });

  useEffect(() => {
    if (page) {
      form.reset({
        title: page.title,
        content: page.content,
        bannerImageUrl: page.bannerImageUrl || '',
      });
    }
  }, [page, form]);

  const mutation = useMutation({
    mutationFn: (values: Partial<FormValues>) => updatePage(slug, values),
    onSuccess: () => {
      toast.success(`Halaman "${pageTitle}" berhasil diperbarui!`);
      queryClient.invalidateQueries({ queryKey: ['cms-page', slug] });
    },
    onError: (error: any) => {
      const errorMessage = Array.isArray(error.response?.data?.message)
        ? error.response.data.message[0]
        : 'Gagal menyimpan perubahan.';
      toast.error(errorMessage);
    },
  });

  const onSubmit = (values: FormValues) => {
    console.log("DATA YANG DIKIRIM SAAT MENYIMPAN:", values);
    mutation.mutate(values);
  };

  const onFormError = (errors: any) => {
    console.error("FORM VALIDATION ERRORS:", errors);
    toast.error('Gagal menyimpan. Periksa kembali data yang Anda masukkan.');
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // ✅ PERBAIKAN: Akses response.data.url, bukan response.url
      form.setValue('bannerImageUrl', response.data.url, { shouldValidate: true });
      toast.success('Gambar berhasil diunggah!');
    } catch (error: any) {
      const errorMessage = Array.isArray(error.response?.data?.message)
        ? error.response.data.message[0]
        : 'Gagal mengunggah gambar.';
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const currentBannerUrl = form.watch('bannerImageUrl');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{pageTitle}</CardTitle>
        <CardDescription>{pageDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-40"><Loader2 className="animate-spin" /></div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, onFormError)} className="space-y-6">
              <FormField name="title" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Judul Halaman</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormItem>
                  <FormLabel>Gambar Banner</FormLabel>
                  {currentBannerUrl ? (
                      <div className="relative group w-full h-48 border rounded-md overflow-hidden">
                          <Image src={currentBannerUrl} alt="Banner preview" layout="fill" objectFit="cover" />
                          <div className="absolute top-2 right-2">
                              <Button variant="destructive" size="icon" type="button" onClick={() => form.setValue('bannerImageUrl', '')}>
                                  <X className="h-4 w-4" />
                              </Button>
                          </div>
                      </div>
                  ) : (
                    <div className="w-full">
                      <FormControl>
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-100">
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                  {isUploading ? <Loader2 className="h-8 w-8 animate-spin text-gray-500" /> : <Upload className="h-8 w-8 text-gray-500" />}
                                  <p className="mt-2 text-sm text-gray-500">{isUploading ? 'Mengunggah...' : 'Klik untuk mengunggah gambar'}</p>
                              </div>
                              <Input type="file" className="hidden" onChange={handleFileChange} accept="image/png, image/jpeg, image/gif, image/webp" disabled={isUploading}/>
                          </label>
                      </FormControl>
                    </div>
                  )}
              </FormItem>

              <FormField name="content" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Konten Halaman</FormLabel>
                  <FormControl>
                    <TiptapEditor value={field.value || ''} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex justify-end">
                <Button type="submit" disabled={mutation.isPending || isUploading}>
                  {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}