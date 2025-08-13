import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Tipe data untuk satu kategori (sesuaikan jika perlu)
export interface Category {
  id: string;
  name: string;
  // createdAt?: string; // Jika Anda ingin menampilkannya
}

interface CategoryData {
  name:string;
}

/**
 * Mengambil semua data kategori dari API.
 */
export const getCategories = async (): Promise<Category[]> => {
  const { data } = await axios.get(`${API_URL}/categories`, {
    withCredentials: true,
  });
  return data;
};

/**
 * Mengirim data kategori baru ke API backend.
 * @param categoryData - Objek yang berisi data kategori baru.
 */
export const createCategory = async (categoryData: CategoryData) => {
    const { data } = await axios.post(`${API_URL}/categories`, categoryData, {
      withCredentials: true,
    });
    return data;
};