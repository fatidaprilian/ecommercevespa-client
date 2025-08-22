// file: app/products/[id]/RelatedProducts.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Product } from '@/types';
import { ProductCard } from '@/components/molecules/ProductCard';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const getRelatedProducts = async (productId: string, type: 'brand' | 'category'): Promise<Product[]> => {
  const { data } = await api.get(`/products/${productId}/related?type=${type}`);
  return data;
};

interface RelatedProductsProps {
  productId: string;
  type: 'brand' | 'category';
  title: string;
}

export function RelatedProducts({ productId, type, title }: RelatedProductsProps) {
  const { data: products, isLoading } = useQuery({
    queryKey: ['related-products', productId, type],
    queryFn: () => getRelatedProducts(productId, type),
    enabled: !!productId,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!products || products.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6 }}
      className="py-12"
    >
      <h2 className="text-3xl font-bold text-center mb-8 font-playfair">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
      </div>
    </motion.div>
  );
}