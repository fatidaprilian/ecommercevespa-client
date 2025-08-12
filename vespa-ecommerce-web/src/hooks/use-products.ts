// src/hooks/use-products.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Product } from '@/types';

const getProducts = async (): Promise<Product[]> => {
  const { data } = await api.get('/products');
  return data;
};

// PASTIKAN NAMA FUNGSI DI SINI ADALAH "useProducts" (PLURAL)
export const useProducts = () => {
  return useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });
};