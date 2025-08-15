// file: vespa-ecommerce-web/app/hooks/use-categories.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Category } from '../types';

/**
 * Fungsi untuk mengambil SEMUA kategori dari API.
 */
const getCategories = async (): Promise<Category[]> => {
  const { data } = await api.get('/categories');
  return data;
};

/**
 * Custom hook untuk mengambil data SEMUA kategori.
 */
export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'], // Kunci query untuk semua kategori
    queryFn: getCategories,
  });
};