// file: app/hooks/use-categories.ts

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { PaginatedCategories } from '@/types';

// Definisikan tipe untuk parameter query
interface CategoryQueryParams {
  limit?: number;
  page?: number;
}

// Fungsi untuk mengambil data dari API
const getCategories = async (params: CategoryQueryParams): Promise<PaginatedCategories> => {
  const { data } = await api.get('/categories', { params });
  return data;
};

// Custom hook `useCategories`
// Secara default, hook ini akan mengambil hingga 999 item
export const useCategories = (params: CategoryQueryParams = { limit: 999, page: 1 }) => {
  return useQuery<PaginatedCategories, Error>({
    queryKey: ['categories', params], // Gunakan params sebagai bagian dari query key
    queryFn: () => getCategories(params),
    staleTime: 1000 * 60 * 5, // Cache data selama 5 menit
  });
};