// file: vespa-ecommerce-web/app/hooks/use-brands.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Brand } from '../types';

/**
 * Fungsi untuk mengambil SEMUA merek dari API.
 */
const getBrands = async (): Promise<Brand[]> => {
  const { data } = await api.get('/brands');
  return data;
};

/**
 * Custom hook untuk mengambil data SEMUA merek.
 */
export const useBrands = () => {
  return useQuery({
    queryKey: ['brands'], // Kunci query untuk semua merek
    queryFn: getBrands,
  });
};