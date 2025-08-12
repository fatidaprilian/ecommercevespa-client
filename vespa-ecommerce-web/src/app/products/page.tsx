// src/app/products/page.tsx
'use client';

import { ProductCard } from '@/components/molecules/ProductCard';
import { useProducts } from '@/hooks/use-products';

export default function ProductsPage() {
  const { data: products, isLoading, error } = useProducts();

  if (isLoading) {
    return <div className="text-center p-10">Loading products...</div>;
  }

  if (error) {
    return <div className="text-center p-10 text-red-500">Error: {error.message}</div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-6">Semua Produk</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products?.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}