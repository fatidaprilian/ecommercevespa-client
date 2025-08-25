import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowLeft, UploadCloud, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCategories, getBrands } from '@/services/pageService';
import { createProduct, uploadImage } from '@/services/productService';

const productFormSchema = z.object({
  name: z.string().min(3, { message: 'Nama produk minimal 3 karakter.' }),
  sku: z.string().min(3, { message: 'SKU minimal 3 karakter.' }),
  price: z.coerce.number().min(1, { message: 'Harga harus lebih dari 0.' }),
  stock: z.coerce.number().int().min(0, { message: 'Stok tidak boleh negatif.' }),
  weight: z.coerce.number().int().min(1, { message: 'Berat minimal 1 gram.' }),
  description: z.string().optional(),
  categoryId: z.string().min(1, { message: 'Kategori harus dipilih.' }),
  brandId: z.string().optional(),
  images: z.array(z.object({ url: z.string() })).optional(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

export default function NewProductPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  const { data: categories, isLoading: isLoadingCategories } = useQuery({ queryKey: ['categories'], queryFn: getCategories });
  const { data: brands, isLoading: isLoadingBrands } = useQuery({ queryKey: ['brands'], queryFn: getBrands });

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: { name: '', sku: '', price: 0, stock: 0, weight: 1000, description: '', categoryId: '', brandId: '', images: [] },
  });

  const mutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produk baru berhasil dibuat!');
      router.push('/products');
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Gagal membuat produk.'),
  });

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    toast.loading('Mengupload gambar...');

    try {
      const response = await uploadImage(file);
      const currentImages = form.getValues('images') || [];
      form.setValue('images', [...currentImages, { url: response.url }]);
      toast.dismiss();
      toast.success('Gambar berhasil di-upload!');
    } catch (error) {
      toast.dismiss();
      toast.error('Upload gambar gagal.');
    } finally {
      setIsUploading(false);
    }
  };
  
  const removeImage = (index: number) => {
    const currentImages = form.getValues('images') || [];
    form.setValue('images', currentImages.filter((_, i) => i !== index));
  }

  const onSubmit = (values: ProductFormValues) => {
    mutation.mutate(values);
  };

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" asChild>
        <Link href="/products">
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Daftar Produk
        </Link>
      </Button>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader><CardTitle>Informasi Dasar Produk</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <FormField name="name" control={form.control} render={({ field }) => (<FormItem><FormLabel>Nama Produk</FormLabel><FormControl><Input placeholder="Contoh: Kampas Rem Depan" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField name="description" control={form.control} render={({ field }) => (<FormItem><FormLabel>Deskripsi</FormLabel><FormControl><Textarea placeholder="Jelaskan detail produk di sini..." {...field} /></FormControl><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <FormField name="sku" control={form.control} render={({ field }) => (<FormItem><FormLabel>SKU</FormLabel><FormControl><Input placeholder="VSP-001" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField name="price" control={form.control} render={({ field }) => (<FormItem><FormLabel>Harga</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField name="stock" control={form.control} render={({ field }) => (<FormItem><FormLabel>Stok</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField name="weight" control={form.control} render={({ field }) => (<FormItem><FormLabel>Berat (gram)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Gambar Produk</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {form.watch('images')?.map((image, index) => (
                  <div key={index} className="relative aspect-square group">
                    <img src={image.url} alt={`product-image-${index}`} className="object-cover w-full h-full rounded-md"/>
                    <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X size={16}/>
                    </button>
                  </div>
                ))}
              </div>
              <FormField
                control={form.control}
                name="images"
                render={() => (
                  <FormItem>
                    <FormControl>
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent">
                        <UploadCloud className="w-10 h-10 text-muted-foreground mb-2"/>
                        <span className="text-sm text-muted-foreground">Klik untuk upload atau drag and drop</span>
                        <Input type="file" className="hidden" onChange={handleImageUpload} disabled={isUploading}/>
                      </label>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Organisasi</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField name="categoryId" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategori</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingCategories}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Pilih kategori..." /></SelectTrigger></FormControl>
                    <SelectContent>{categories?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="brandId" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Merek (Opsional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingBrands}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Pilih merek..." /></SelectTrigger></FormControl>
                    <SelectContent>{brands?.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={mutation.isPending || isUploading}>
              {mutation.isPending ? 'Menyimpan...' : 'Simpan Produk'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}