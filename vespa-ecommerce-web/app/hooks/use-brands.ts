import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { PaginatedBrands } from '@/types';

interface BrandQueryParams {
  limit?: number;
  page?: number;
}

const getBrands = async (params: BrandQueryParams): Promise<PaginatedBrands> => {
  const { data } = await api.get('/brands', { params });
  return data;
};

export const useBrands = (params: BrandQueryParams = { limit: 999, page: 1 }) => {
  return useQuery<PaginatedBrands, Error>({
    queryKey: ['brands', params],
    queryFn: () => getBrands(params),
    staleTime: 1000 * 60 * 5,
  });
};