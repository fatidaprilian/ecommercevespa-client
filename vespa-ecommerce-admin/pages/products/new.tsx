import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import axios from 'axios';

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
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // <-- Impor komponen Select

import { createProduct } from '../services/productService';

// Fungsi untuk fetch data kategori dan merek
const fetchCategories = async () => {
  const { data } = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/categories`, { withCredentials: true });
  return data;
};

const fetchBrands = async () => {
  const { data } = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/brands`, { withCredentials: true });
  return data;
};

// Skema Zod tetap sama
const productFormSchema = z.object({
  name: z.string().min(3, { message: 'Nama produk minimal 3 karakter.' }),
  sku: z.string().min(3, { message: 'SKU minimal 3 karakter.' }),
  price: z.coerce.number().min(1, { message: 'Harga harus lebih dari 0.' }),
  stock: z.coerce.number().int().min(0, { message: 'Stok tidak boleh negatif.' }),
  description: z.string().optional(),
  categoryId: z.string().min(1, { message: 'Kategori harus dipilih.' }),
  brandId: z.string().min(1, { message: 'Merek harus dipilih.' }),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

export default function NewProductPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Fetch data untuk dropdown menggunakan React Query
  const { data: categories, isLoading: isLoadingCategories } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories });
  const { data: brands, isLoading: isLoadingBrands } = useQuery({ queryKey: ['brands'], queryFn: fetchBrands });

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '', sku: '', price: 0, stock: 0, description: '', categoryId: '', brandId: '',
    },
  });

  const mutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produk baru berhasil dibuat!');
      router.push('/products');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Gagal membuat produk.';
      toast.error(errorMessage);
    },
  });

  function onSubmit(values: ProductFormValues) {
    mutation.mutate(values);
  }

  return (
    <div>
      <div className="mb-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/products">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Tambah Produk Baru</CardTitle></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Field Nama Produk */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Produk</FormLabel>
                    <FormControl><Input placeholder="Contoh: Kampas Rem Depan" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* GANTI INPUT DENGAN DROPDOWN */}
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategori</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingCategories}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih kategori..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.map((category: any) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="brandId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Merek</FormLabel>
                       <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingBrands}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih merek..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {brands?.map((brand: any) => (
                            <SelectItem key={brand.id} value={brand.id}>
                              {brand.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Field SKU, Harga, Stok, Deskripsi */}
              <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                <FormField control={form.control} name="sku" render={({ field }) => (<FormItem><FormLabel>SKU</FormLabel><FormControl><Input placeholder="VSP-001" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormLabel>Harga</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="stock" render={({ field }) => (<FormItem><FormLabel>Stok</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Deskripsi</FormLabel><FormControl><Textarea placeholder="Deskripsi produk..." {...field} /></FormControl><FormMessage /></FormItem>)} />

              <div className="flex justify-end">
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? 'Menyimpan...' : 'Simpan Produk'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}