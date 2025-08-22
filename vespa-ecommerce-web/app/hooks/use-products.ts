// file: app/hooks/use-products.ts
'use client';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { PaginatedProducts } from '../types';

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  categoryId?: string;
  brandId?: string[]; // Diubah menjadi array of string
  sortBy?: 'price' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

const getProducts = async (params: ProductQueryParams): Promise<PaginatedProducts> => {
  // Logika diubah untuk menangani array brandId
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value != null) {
      if (key === 'brandId' && Array.isArray(value)) {
        // Tambahkan setiap brandId sebagai parameter terpisah
        value.forEach(id => searchParams.append(key, id));
      } else {
        searchParams.set(key, String(value));
      }
    }
  });

  const { data } = await api.get(`/products?${searchParams.toString()}`);
  return data;
};

export const useProducts = (params: ProductQueryParams, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => getProducts(params),
    keepPreviousData: true,
    enabled: enabled,
  });
};