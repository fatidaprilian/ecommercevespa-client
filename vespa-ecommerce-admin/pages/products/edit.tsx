import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { toast } from 'sonner'; 
import { ArrowLeft, UploadCloud, X, Trash2, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCategories, getBrands } from '@/services/pageService';
import { getProductById, updateProduct, uploadImage, deleteProduct, Product } from '@/services/productService';

// Schema Validation
const productFormSchema = z.object({
  name: z.string().min(3, { message: 'Nama produk minimal 3 karakter.' }),
  sku: z.string().min(3, { message: 'SKU minimal 3 karakter.' }),
  price: z.coerce.number().min(0, { message: 'Harga tidak boleh negatif.' }),
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

  // Reset form saat data awal dimuat
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
      // Invalidate queries agar data terbaru diambil saat user kembali
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      
      toast.success('Produk berhasil diperbarui!');
      
      // 👇 REVISI: Gunakan router.back() agar filter pencarian (polini) tidak hilang
      router.back();
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
      router.push('/products'); // Kalau hapus, tetap redirect ke index bersih
    },
    onError: (error: any) => {
      toast.error('Gagal Menghapus Produk', {
        description: error.response?.data?.message || 'Terjadi kesalahan.',
      });
    },
  });

  // 👇 REVISI: Handle Multiple Upload + Validasi Nama
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const toastId = toast.loading(`Mengupload ${files.length} gambar...`);
    
    try {
      // Proses upload multiple secara paralel
      const uploadPromises = Array.from(files).map(file => uploadImage(file));
      const responses = await Promise.all(uploadPromises);
      
      // Ambil gambar yang sudah ada di form
      const currentImages = form.getValues('images') || [];
      const newImages = responses.map(res => ({ url: res.url }));
      
      // Gabungkan gambar lama + baru
      form.setValue('images', [...currentImages, ...newImages]);
      
      toast.dismiss(toastId);
      toast.success(`${files.length} Gambar berhasil di-upload!`);
    } catch (error) {
      toast.dismiss(toastId);
      toast.error('Sebagian atau semua gambar gagal di-upload.');
    } finally {
      setIsUploading(false);
      // Reset value input agar bisa upload file yang sama lagi jika perlu
      event.target.value = ''; 
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
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      <div className="flex justify-between items-center">
        {/* 👇 REVISI: Tombol Back manual pakai router.back() agar filter search tidak hilang */}
        <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
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
              
              <FormField 
                name="name" 
                control={form.control} 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Produk</FormLabel>
                    <FormControl>
                      {/* Tambahan className max-w-full agar input tidak meluber */}
                      <Input placeholder="Contoh: Kampas Rem Depan" {...field} className="max-w-full" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} 
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-w-0">
                <FormField 
                  name="piaggioCode" 
                  control={form.control} 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Piaggio Code</FormLabel>
                      <FormControl>
                         {/* Tambahan className max-w-full */}
                        <Input placeholder="Contoh: 1D000543" {...field} value={field.value || ''} className="max-w-full" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} 
                />
                <FormField 
                  name="models" 
                  control={form.control} 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Models</FormLabel>
                      <FormControl>
                         {/* Tambahan className max-w-full */}
                        <Input placeholder="Contoh: PX125E, PX150E" {...field} value={field.value || ''} className="max-w-full" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} 
                />
              </div>

              <FormField 
                name="description" 
                control={form.control} 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deskripsi</FormLabel>
                    <FormControl>
                      {/* 👇 PENTING: className="break-all" agar teks panjang tanpa spasi (url/hash) patah ke bawah */}
                      <Textarea 
                        placeholder="Jelaskan detail produk di sini..." 
                        {...field} 
                        value={field.value || ''} 
                        className="break-all whitespace-pre-wrap max-w-full" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} 
              />

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 min-w-0">
                <FormField 
                  name="sku" 
                  control={form.control} 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU (dari Accurate)</FormLabel>
                      <FormControl>
                        <Input placeholder="VSP-001" {...field} className="max-w-full" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} 
                />
                
                <FormField 
                  name="price" 
                  control={form.control} 
                  render={({ field }) => (
                    <FormItem>
                        <FormLabel>Harga (Rp)</FormLabel>
                        <FormControl>
                            <Input type="number" {...field} className="max-w-full" />
                        </FormControl>
                        <FormDescription className="text-xs text-muted-foreground">
                            Biarkan nilai lama jika tidak ingin diubah. Isi 0 jika gratis.
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                )} />
                
                <FormField 
                  name="stock" 
                  control={form.control} 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stok</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="max-w-full" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} 
                />
                <FormField 
                  name="weight" 
                  control={form.control} 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Berat (gram)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="max-w-full" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} 
                />
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
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent max-w-full">
                      <UploadCloud className="w-10 h-10 text-muted-foreground mb-2"/>
                      <span className="text-sm text-muted-foreground">Klik untuk upload (Bisa pilih banyak)</span>
                      
                      {/* 👇 REVISI: Tambahkan property 'multiple' */}
                      <Input 
                        type="file" 
                        multiple 
                        className="hidden" 
                        onChange={handleImageUpload} 
                        disabled={isUploading}
                        accept="image/*"
                      />

                    </label>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Organisasi</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 min-w-0">
              <FormField name="categoryId" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategori</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="max-w-full"><SelectValue placeholder="Pilih kategori..." /></SelectTrigger></FormControl>
                    <SelectContent>{categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="brandId" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Merek</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="max-w-full"><SelectValue placeholder="Pilih merek..." /></SelectTrigger></FormControl>
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
  
  const { data: product, isLoading: isLoadingProduct, isError } = useQuery<Product, Error>({ 
    queryKey: ['product', productId], 
    queryFn: () => getProductById(productId), 
    enabled: !!productId,
    // 👇 REVISI: Matikan auto-refetch agar form tidak reset saat pindah tab browser
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: categoriesResponse, isLoading: isLoadingCategories } = useQuery({ queryKey: ['categories'], queryFn: () => getCategories(), refetchOnWindowFocus: false });
  const { data: brandsResponse, isLoading: isLoadingBrands } = useQuery({ queryKey: ['brands'], queryFn: () => getBrands(), refetchOnWindowFocus: false });
  
  if (isLoadingProduct || isLoadingCategories || isLoadingBrands) return <div className="flex justify-center p-8"><Loader2 className="animate-spin"/></div>;
  if (isError || !product) return <p className="text-center p-6 text-red-500">Gagal memuat.</p>;

  return <EditProductForm initialData={product} categories={categoriesResponse?.data || []} brands={brandsResponse?.data || []} />;
}