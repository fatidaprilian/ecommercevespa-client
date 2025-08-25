import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { PaginatedCategories } from '@/types';

interface CategoryQueryParams {
  limit?: number;
  page?: number;
}

const getCategories = async (params: CategoryQueryParams): Promise<PaginatedCategories> => {
  const { data } = await api.get('/categories', { params });
  return data;
};

export const useCategories = (params: CategoryQueryParams = { limit: 999, page: 1 }) => {
  return useQuery<PaginatedCategories, Error>({
    queryKey: ['categories', params], 
    queryFn: () => getCategories(params),
    staleTime: 1000 * 60 * 5, 
  });
};