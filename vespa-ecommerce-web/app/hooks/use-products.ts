'use client';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { PaginatedProducts } from '../types';

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  categoryId?: string; // Pastikan nama ini cocok dengan DTO backend
  brandId?: string;    // Pastikan nama ini cocok dengan DTO backend
  sortBy?: 'price' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

const getProducts = async (params: ProductQueryParams): Promise<PaginatedProducts> => {
  const queryString = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value != null).map(([key, value]) => [key, String(value)])
  ).toString();
  const { data } = await api.get(`/products?${queryString}`);
  return data;
};

export const useProducts = (params: ProductQueryParams) => {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => getProducts(params),
    keepPreviousData: true,
  });
};