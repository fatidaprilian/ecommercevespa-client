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
          <div className="flex justify-between items-center mb-2">
            {/* Kategori */}
            <span className="text-xs text-gray-500">{product.category?.name || 'Uncategorized'}</span>
            
            {/* Logo Merek */}
            {product.brand?.logoUrl ? (
              <img 
                src={product.brand.logoUrl} 
                alt={product.brand.name || 'Brand Logo'} 
               
                className="h-8 max-w-[80px] object-contain" 
              />
            ) : (
              <span className="text-xs font-semibold text-gray-800">{product.brand?.name || ''}</span>
            )}
          </div>
          
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