// pages/categories/edit.tsx
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowLeft, Trash2, UploadCloud, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCategoryById, updateCategory, deleteCategory, CategoryData } from '@/services/categoryService';
import { uploadImage } from '@/services/productService'; // Re-use from product service

// 👇 **START OF CHANGES** 👇
const categoryFormSchema = z.object({
  name: z.string().min(3, { message: 'Nama kategori minimal 3 karakter.' }),
  imageUrl: z.string().optional(),
});
// 👆 **END OF CHANGES** 👆

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export default function EditCategoryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = router.query;
  const categoryId = typeof id === 'string' ? id : '';
  const [isUploading, setIsUploading] = useState(false);

  const { data: category, isLoading, isError } = useQuery({
    queryKey: ['category', categoryId],
    queryFn: () => getCategoryById(categoryId),
    enabled: !!categoryId,
  });

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: '', imageUrl: '' },
  });

  useEffect(() => {
    if (category) {
      form.reset({
        name: category.name,
        imageUrl: category.imageUrl || '',
      });
    }
  }, [category, form]);

  const updateMutation = useMutation({
    mutationFn: (values: CategoryData) => updateCategory(categoryId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Kategori berhasil diperbarui!');
      router.push('/categories');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal memperbarui kategori.');
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
      toast.error(error.response?.data?.message || 'Gagal menghapus kategori.');
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
      toast.success('Logo berhasil diunggah!', { id: toastId });
    } catch (error) {
      toast.error('Gagal mengunggah logo.', { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    form.setValue('imageUrl', '', { shouldValidate: true });
  };
  // 👆 **END OF CHANGES: FUNGSI UPLOAD** 👆

  const onSubmit = (values: CategoryFormValues) => {
    updateMutation.mutate(values);
  };
  
  const handleDelete = () => {
    if (window.confirm('Anda yakin ingin menghapus kategori ini?')) {
      deleteMutation.mutate();
    }
  };

  if (isLoading) return <p className="text-center p-4">Memuat data kategori...</p>;
  if (isError) return <p className="text-center p-4 text-red-500">Kategori tidak ditemukan.</p>;
  
  const imageUrlValue = form.watch('imageUrl');

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" asChild>
        <Link href="/categories"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Link>
      </Button>

      <Card>
        <CardHeader><CardTitle>Edit Kategori</CardTitle></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Kategori</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
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

              <div className="flex justify-between items-center pt-4">
                <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
                  <Trash2 className="mr-2 h-4 w-4" />{deleteMutation.isPending ? 'Menghapus...' : 'Hapus'}
                </Button>
                <Button type="submit" disabled={updateMutation.isPending || isUploading}>
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