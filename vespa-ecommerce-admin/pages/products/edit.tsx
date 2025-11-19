// File: pages/products/edit.tsx

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { toast } from 'sonner'; 
import { ArrowLeft, UploadCloud, X, Trash2, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'; // Tambah FormDescription
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCategories, getBrands } from '@/services/pageService';
import { getProductById, updateProduct, uploadImage, deleteProduct, Product } from '@/services/productService';

// 👇 REVISI SCHEMA: Harga & Stok minimal 0 (boleh 0), bukan 1
const productFormSchema = z.object({
  name: z.string().min(3, { message: 'Nama produk minimal 3 karakter.' }),
  sku: z.string().min(3, { message: 'SKU minimal 3 karakter.' }),
  price: z.coerce.number().min(0, { message: 'Harga tidak boleh negatif.' }), // Ubah min(1) jadi min(0)
  stock: z.coerce.number().int().min(0, { message: 'Stok tidak boleh negatif.' }),
  weight: z.coerce.number().int().min(1, { message: 'Berat minimal 1 gram.' }),
  description: z.string().optional(),
  piaggioCode: z.string().optional(),
  models: z.string().optional(),
  categoryId: z.string().min(1, { message: 'Kategori harus dipilih.' }),
  brandId: z.string().optional(),
  images: z.array(z.object({ url: z.string() })).optional(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

function EditProductForm({ initialData, categories, brands }: { initialData: Product; categories: any[]; brands: any[] }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const productId = initialData.id;
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: initialData.name || '',
      sku: initialData.sku || '',
      price: initialData.price || 0,
      stock: initialData.stock || 0,
      weight: initialData.weight || 1000,
      description: initialData.description || '',
      piaggioCode: initialData.piaggioCode || '',
      models: initialData.models || '',
      categoryId: initialData.categoryId || '',
      brandId: initialData.brandId || '',
      images: initialData.images || [],
    },
  });

  // 👇 PENTING: Reset form saat data awal dimuat agar harga lama terisi otomatis
  useEffect(() => {
    if (initialData) {
        form.reset({
            name: initialData.name,
            sku: initialData.sku,
            price: initialData.price,
            stock: initialData.stock,
            weight: initialData.weight,
            description: initialData.description || '',
            piaggioCode: initialData.piaggioCode || '',
            models: initialData.models || '',
            categoryId: initialData.categoryId,
            brandId: initialData.brandId || '',
            images: initialData.images || [],
        });
    }
  }, [initialData, form]);

  const updateMutation = useMutation({
    mutationFn: (values: ProductFormValues) => updateProduct(productId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      toast.success('Produk berhasil diperbarui!');
      router.push('/products');
    },
    onError: (error: any) => {
        toast.error('Gagal Memperbarui Produk', {
            description: error.response?.data?.message || 'Terjadi kesalahan.',
        });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteProduct(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produk berhasil dihapus.');
      router.push('/products');
    },
    onError: (error: any) => {
      toast.error('Gagal Menghapus Produk', {
        description: error.response?.data?.message || 'Terjadi kesalahan.',
      });
    },
  });

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading('Mengupload gambar...');
    try {
      const response = await uploadImage(file);
      const currentImages = form.getValues('images') || [];
      form.setValue('images', [...currentImages, { url: response.url }]);
      toast.dismiss(toastId);
      toast.success('Gambar berhasil di-upload!');
    } catch (error) {
      toast.dismiss(toastId);
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
    updateMutation.mutate(values);
  };

  const handleDelete = () => {
    if(window.confirm('Anda yakin ingin menghapus produk ini secara permanen?')) {
      deleteMutation.mutate();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button variant="outline" size="sm" asChild>
          <Link href="/products">
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Daftar Produk
          </Link>
        </Button>
        <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleteMutation.isPending}>
          <Trash2 className="mr-2 h-4 w-4" /> 
          {deleteMutation.isPending ? 'Menghapus...' : 'Hapus Produk'}
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader><CardTitle>Informasi Dasar Produk</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <FormField name="name" control={form.control} render={({ field }) => (<FormItem><FormLabel>Nama Produk</FormLabel><FormControl><Input placeholder="Contoh: Kampas Rem Depan" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField name="piaggioCode" control={form.control} render={({ field }) => (<FormItem><FormLabel>Piaggio Code</FormLabel><FormControl><Input placeholder="Contoh: 1D000543" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                <FormField name="models" control={form.control} render={({ field }) => (<FormItem><FormLabel>Models</FormLabel><FormControl><Input placeholder="Contoh: PX125E, PX150E" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField name="description" control={form.control} render={({ field }) => (<FormItem><FormLabel>Deskripsi</FormLabel><FormControl><Textarea placeholder="Jelaskan detail produk di sini..." {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <FormField name="sku" control={form.control} render={({ field }) => (<FormItem><FormLabel>SKU (dari Accurate)</FormLabel><FormControl><Input placeholder="VSP-001" {...field} /></FormControl><FormMessage /></FormItem>)} />
                
                {/* 👇 FIELD HARGA DENGAN PESAN BANTUAN 👇 */}
                <FormField name="price" control={form.control} render={({ field }) => (
                    <FormItem>
                        <FormLabel>Harga (Rp)</FormLabel>
                        <FormControl>
                            <Input type="number" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs text-muted-foreground">
                            Biarkan nilai lama jika tidak ingin diubah. Isi 0 jika gratis.
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                )} />
                
                <FormField name="stock" control={form.control} render={({ field }) => (<FormItem><FormLabel>Stok</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField name="weight" control={form.control} render={({ field }) => (<FormItem><FormLabel>Berat (gram)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Gambar Produk</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {form.watch('images')?.map((image, index) => (
                  <div key={index} className="relative w-20 h-20 group">
                    <img src={image.url} alt={`product-${index}`} className="object-cover w-full h-full rounded-lg border-2 border-gray-200"/>
                    <button type="button" onClick={() => removeImage(index)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"><X size={14}/></button>
                  </div>
                ))}
                {isUploading && <div className="relative w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 bg-muted/50 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}
              </div>
              <FormField control={form.control} name="images" render={() => (
                <FormItem>
                  <FormControl>
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent">
                      <UploadCloud className="w-10 h-10 text-muted-foreground mb-2"/>
                      <span className="text-sm text-muted-foreground">Klik untuk upload</span>
                      <Input type="file" className="hidden" onChange={handleImageUpload} disabled={isUploading}/>
                    </label>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Organisasi</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField name="categoryId" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategori</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Pilih kategori..." /></SelectTrigger></FormControl>
                    <SelectContent>{categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="brandId" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Merek</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Pilih merek..." /></SelectTrigger></FormControl>
                    <SelectContent>{brands.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateMutation.isPending || isUploading}>
              {updateMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default function EditProductPage() {
  const router = useRouter();
  const { id } = router.query;
  const productId = typeof id === 'string' ? id : '';
  
  const { data: product, isLoading: isLoadingProduct, isError } = useQuery<Product, Error>({ queryKey: ['product', productId], queryFn: () => getProductById(productId), enabled: !!productId });
  const { data: categoriesResponse, isLoading: isLoadingCategories } = useQuery({ queryKey: ['categories'], queryFn: () => getCategories() });
  const { data: brandsResponse, isLoading: isLoadingBrands } = useQuery({ queryKey: ['brands'], queryFn: () => getBrands() });
  
  if (isLoadingProduct || isLoadingCategories || isLoadingBrands) return <div className="flex justify-center p-8"><Loader2 className="animate-spin"/></div>;
  if (isError || !product) return <p className="text-center p-6 text-red-500">Gagal memuat.</p>;

  return <EditProductForm initialData={product} categories={categoriesResponse?.data || []} brands={brandsResponse?.data || []} />;
}