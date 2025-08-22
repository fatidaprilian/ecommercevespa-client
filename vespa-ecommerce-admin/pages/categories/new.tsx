// pages/categories/new.tsx
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createCategory, CategoryData } from '@/services/categoryService';
import { uploadImage } from '@/services/productService'; // Kita gunakan ulang service upload dari produk

// 👇 **START OF CHANGES** 👇
const categoryFormSchema = z.object({
  name: z.string().min(3, { message: 'Nama kategori minimal 3 karakter.' }),
  imageUrl: z.string().optional(),
});
// 👆 **END OF CHANGES** 👆

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export default function NewCategoryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: '', imageUrl: '' },
  });

  const mutation = useMutation({
    mutationFn: (data: CategoryData) => createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Kategori baru berhasil dibuat!');
      router.push('/categories');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal membuat kategori.');
    },
  });

  // 👇 **START OF CHANGES: FUNGSI UPLOAD** 👇
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading('Mengunggah gambar...');

    try {
      const response = await uploadImage(file);
      form.setValue('imageUrl', response.url, { shouldValidate: true });
      toast.success('Gambar berhasil diunggah!', { id: toastId });
    } catch (error) {
      toast.error('Gagal mengunggah gambar.', { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    form.setValue('imageUrl', '', { shouldValidate: true });
  };
  // 👆 **END OF CHANGES: FUNGSI UPLOAD** 👆

  function onSubmit(values: CategoryFormValues) {
    mutation.mutate(values);
  }
  
  const imageUrlValue = form.watch('imageUrl');

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" asChild>
        <Link href="/categories"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Link>
      </Button>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Informasi Kategori</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Kategori</FormLabel>
                  <FormControl><Input placeholder="Contoh: Aksesoris" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              {/* 👇 **START OF CHANGES: FORM UPLOAD** 👇 */}
              <FormField control={form.control} name="imageUrl" render={() => (
                <FormItem>
                  <FormLabel>Gambar Kategori</FormLabel>
                  <FormControl>
                    <>
                      {imageUrlValue ? (
                        <div className="relative w-48 h-48 group">
                          <img src={imageUrlValue} alt="Preview" className="w-full h-full object-cover rounded-md border p-2" />
                          <button type="button" onClick={removeImage} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity" disabled={isUploading}>
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent">
                          <UploadCloud className="w-10 h-10 text-muted-foreground mb-2" />
                          <span className="text-sm text-muted-foreground">Klik untuk mengunggah</span>
                          <Input type="file" className="hidden" onChange={handleImageUpload} disabled={isUploading} accept="image/*" />
                        </label>
                      )}
                    </>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              {/* 👆 **END OF CHANGES: FORM UPLOAD** 👆 */}
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <Button type="submit" disabled={mutation.isPending || isUploading}>
              {mutation.isPending ? 'Menyimpan...' : 'Simpan Kategori'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}