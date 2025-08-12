'use client';

import { Product } from '@/types';
import Link from 'next/link';

type ProductCardProps = {
  product: Product;
};

// Helper untuk format harga
const formatPrice = (price: string) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(Number(price));
};

export const ProductCard = ({ product }: ProductCardProps) => {
  return (
    <Link href={`/products/${product.id}`} className="block group">
      <div className="border rounded-lg overflow-hidden shadow-lg group-hover:shadow-xl transition-shadow duration-300 flex flex-col h-full">
        <div className="relative w-full h-48 bg-gray-200">
          {/* Tampilkan gambar pertama jika ada, jika tidak, tampilkan placeholder */}
          {product.images && product.images.length > 0 ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <span className="text-gray-500">Gambar Produk</span>
            </div>
          )}
        </div>
        <div className="p-4 flex flex-col flex-grow">
          <h3 className="font-bold text-lg truncate flex-grow" title={product.name}>
            {product.name}
          </h3>
          <p className="text-gray-500 text-sm mt-1">{product.sku}</p>
          <p className="text-xl font-semibold mt-2 text-red-600">
            {formatPrice(product.price)}
          </p>
        </div>
      </div>
    </Link>
  );
};