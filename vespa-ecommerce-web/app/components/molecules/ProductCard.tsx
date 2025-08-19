// file: app/components/molecules/ProductCard.tsx
'use client';

import { Product } from '../../types';
import Link from 'next/link';
import PriceDisplay from './PriceDisplay';

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  const imageUrl = product.images && product.images.length > 0
    ? product.images[0].url
    : 'https://placehold.co/400x400?text=VespaPart';

  return (
    <Link href={`/products/${product.id}`} className="block group">
      <div className="bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 flex flex-col h-full">
        <div className="relative w-full h-48 bg-gray-200">
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        <div className="p-4 flex flex-col flex-grow">
          <span className="text-xs text-gray-500 mb-1">{product.category?.name || 'Uncategorized'}</span>
          <h3 className="font-bold text-md text-gray-800 flex-grow group-hover:text-primary transition-colors h-12" title={product.name}>
            {product.name}
          </h3>
          
          <div className="mt-2">
            <PriceDisplay priceInfo={product.priceInfo} />
          </div>
        </div>
      </div>
    </Link>
  );
}