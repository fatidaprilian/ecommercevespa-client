// file: app/hooks/use-brands.ts

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { PaginatedBrands } from '@/types';

// Definisikan tipe untuk parameter query
interface BrandQueryParams {
  limit?: number;
  page?: number;
}

// Fungsi untuk mengambil data dari API
const getBrands = async (params: BrandQueryParams): Promise<PaginatedBrands> => {
  const { data } = await api.get('/brands', { params });
  return data;
};

// Custom hook `useBrands`
// Secara default, hook ini akan mengambil hingga 999 item (dianggap sebagai "semua")
export const useBrands = (params: BrandQueryParams = { limit: 999, page: 1 }) => {
  return useQuery<PaginatedBrands, Error>({
    queryKey: ['brands', params], // Gunakan params sebagai bagian dari query key
    queryFn: () => getBrands(params),
    staleTime: 1000 * 60 * 5, // Cache data selama 5 menit
  });
};