// pages/products/index.tsx

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';

// Tipe data untuk produk agar lebih aman
type Product = {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
};

// Fungsi untuk mengambil data produk dari API
const fetchProducts = async (): Promise<Product[]> => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const { data } = await axios.get(`${apiUrl}/products`, {
    withCredentials: true,
  });
  return data; // Asumsikan API mengembalikan array of products
};

export default function ProductsPage() {
  const { data: products, isLoading, isError, error } = useQuery<Product[], Error>({
    queryKey: ['products'], // Kunci unik untuk query ini
    queryFn: fetchProducts,   // Fungsi yang akan dijalankan untuk fetch data
  });

  if (isLoading) {
    return <span>Loading...</span>;
  }

  if (isError) {
    return <span>Error: {error.message}</span>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manajemen Produk</h1>
          <p className="text-muted-foreground">
            Kelola semua produk yang ada di toko Anda.
          </p>
        </div>
        <Link href="/products/new">
    <Button>
    <PlusCircle className="mr-2 h-4 w-4" /> Tambah Produk
    </Button>
        </Link>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Produk</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Harga</TableHead>
              <TableHead>Stok</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products?.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>{product.sku}</TableCell>
                <TableCell>Rp{product.price.toLocaleString('id-ID')}</TableCell>
                <TableCell>{product.stock}</TableCell>
                <TableCell>{/* Tombol Edit/Hapus akan di sini */}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}