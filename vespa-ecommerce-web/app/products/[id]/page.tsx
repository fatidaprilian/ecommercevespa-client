// src/app/products/[id]/page.tsx
'use client';

import { useProduct } from '@/hooks/use-product';
import { useParams } from 'next/navigation';

// Helper untuk format harga
const formatPrice = (price: string) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(Number(price));
};

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;
  const { data: product, isLoading, error } = useProduct(productId);

  if (isLoading) {
    return <div className="text-center p-10">Loading product details...</div>;
  }

  if (error) {
    return <div className="text-center p-10 text-red-500">Error: {error.message}</div>;
  }

  if (!product) {
    return <div className="text-center p-10">Product not found.</div>;
  }

  return (
    <div className="container mx-auto p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-gray-200 h-96 flex items-center justify-center rounded-lg">
          {/* Nanti bisa diganti dengan carousel gambar */}
          <span className="text-gray-500">Gambar Produk</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold mb-2">{product.name}</h1>
          <p className="text-lg text-gray-500 mb-4">SKU: {product.sku}</p>
          <p className="text-4xl font-light text-red-600 mb-6">
            {formatPrice(product.price)}
          </p>
          <div className="mb-6">
            <h2 className="font-semibold text-xl mb-2">Deskripsi</h2>
            <p className="text-gray-700">{product.description || 'Tidak ada deskripsi.'}</p>
          </div>
          <div className="mb-6">
            <span className="text-lg">Stok: </span>
            <span className="font-bold text-lg">{product.stock}</span>
          </div>
          <button className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors">
            Tambah ke Keranjang
          </button>
        </div>
      </div>
    </div>
  );
}