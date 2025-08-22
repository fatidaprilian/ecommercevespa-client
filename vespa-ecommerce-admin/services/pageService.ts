// pages/services/pageService.ts
import api from '@/lib/api';

/**
 * Mengambil semua data kategori dari API.
 * Secara default mengambil semua data untuk digunakan di dropdown/picker.
 */
export const getCategories = async () => {
  const { data } = await api.get('/categories', {
    params: {
      // Minta API untuk mengirim semua item dalam satu halaman
      limit: 999 
    }
  });
  // Langsung kembalikan array datanya, bukan objek paginasi
  return data.data; 
};

/**
 * Mengambil semua data merek dari API.
 * Secara default mengambil semua data untuk digunakan di dropdown/picker.
 */
export const getBrands = async () => {
  const { data } = await api.get('/brands', {
    params: {
      // Minta API untuk mengirim semua item dalam satu halaman
      limit: 999
    }
  });
  // Langsung kembalikan array datanya, bukan objek paginasi
  return data.data;
};