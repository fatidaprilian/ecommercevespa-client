// file: vespa-ecommerce-web/app/hooks/use-product.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Product } from '../types';

/**
 * Fungsi untuk mengambil SATU produk dari API berdasarkan ID-nya.
 * @param productId - ID dari produk yang ingin diambil.
 */
const getProductById = async (productId: string): Promise<Product> => {
  if (!productId) {
    throw new Error('Product ID is required to fetch a product.');
  }
  const { data } = await api.get(`/products/${productId}`);
  return data;
};

/**
 * Custom hook untuk mengambil data SATU produk.
 * @param productId - ID dari produk.
 */
export const useProduct = (productId: string) => {
  return useQuery({
    queryKey: ['product', productId], // Kunci query unik untuk produk spesifik ini
    queryFn: () => getProductById(productId),
    enabled: !!productId, // Hanya aktifkan query ini jika productId sudah ada
  });
};