// file: vespa-ecommerce-admin/pages/services/pageService.ts

import api from '@/lib/api';

/**
 * Mengambil semua data kategori dari API.
 */
export const getCategories = async () => {
  const { data } = await api.get('/categories');
  return data;
};

/**
 * Mengambil semua data merek dari API.
 */
export const getBrands = async () => {
  const { data } = await api.get('/brands');
  return data;
};