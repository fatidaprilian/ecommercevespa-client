// file: vespa-ecommerce-web/app/hooks/use-products.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Product } from '../types';

/**
 * Fungsi untuk mengambil SEMUA produk dari API.
 */
const getProducts = async (): Promise<Product[]> => {
  const { data } = await api.get('/products');
  return data;
};

/**
 * Custom hook untuk mengambil data SEMUA produk.
 */
export const useProducts = () => {
  return useQuery({
    queryKey: ['products'], // Kunci query untuk semua produk
    queryFn: getProducts,
  });
};