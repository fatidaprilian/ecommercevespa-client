// file: app/hooks/use-products.ts
'use client';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { PaginatedProducts } from '../types';

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  categoryId?: string;
  brandId?: string;
  sortBy?: 'price' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  search?: string; // <-- Tambahkan properti search
}

// ✅ KUNCI PERBAIKAN: Tambahkan parameter 'enabled'
const getProducts = async (params: ProductQueryParams): Promise<PaginatedProducts> => {
  const queryString = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value != null).map(([key, value]) => [key, String(value)])
  ).toString();
  const { data } = await api.get(`/products?${queryString}`);
  return data;
};

// ✅ KUNCI PERBAIKAN: Terima 'enabled' dan teruskan ke useQuery
export const useProducts = (params: ProductQueryParams, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => getProducts(params),
    keepPreviousData: true,
    enabled: enabled, // <-- Gunakan di sini
  });
};