import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Product } from '../types';

/**
 * Fetches featured products from the API.
 * @returns {Promise<Product[]>} A promise that resolves to an array of featured products.
 */
const fetchFeaturedProducts = async (): Promise<Product[]> => {
  const { data } = await api.get('/products/featured');
  return data;
};

/**
 * Custom hook to get featured products.
 * It uses React Query to fetch, cache, and manage the state of the featured products.
 */
export const useFeaturedProducts = (enabled: boolean = true) => {
  return useQuery<Product[], Error>({
    queryKey: ['featured-products'],
    queryFn: fetchFeaturedProducts,
    enabled,
  });
};

const fetchSecondaryFeaturedProducts = async (excludeIds?: string[]): Promise<Product[]> => {
  const params = excludeIds && excludeIds.length > 0 ? { excludeIds: excludeIds.join(',') } : {};
  const { data } = await api.get('/products/secondary-featured', { params });
  return data;
};

export const useSecondaryFeaturedProducts = (excludeIds?: string[], enabled: boolean = true) => {
  return useQuery<Product[], Error>({
    queryKey: ['secondary-featured-products', excludeIds],
    queryFn: () => fetchSecondaryFeaturedProducts(excludeIds),
    enabled,
  });
};
