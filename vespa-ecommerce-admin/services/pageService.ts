
import api from '@/lib/api';

/**
 * Mengambil semua data kategori dari API.
 * Secara default mengambil semua data untuk digunakan di dropdown/picker.
 */
export const getCategories = async () => {
  const { data } = await api.get('/categories', {
    params: {
      
      limit: 999 
    }
  });
  
  return data.data; 
};

/**
 * Mengambil semua data merek dari API.
 * Secara default mengambil semua data untuk digunakan di dropdown/picker.
 */
export const getBrands = async () => {
  const { data } = await api.get('/brands', {
    params: {
      
      limit: 999
    }
  });
  
  return data.data;
};