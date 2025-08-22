// pages/services/brandService.ts
import api from '@/lib/api';

// Define the Brand data structure
export interface Brand {
  id: string;
  name: string;
  logoUrl?: string;
  createdAt: string;
}

// Tambahkan definisi tipe data untuk payload
export interface BrandData {
  name: string;
  logoUrl?: string;
}

// Tipe data untuk struktur respons paginasi dari API
export interface PaginatedBrands {
  data: Brand[];
  meta: {
    total: number;
    page: number;
    limit: number;
    lastPage: number;
  };
}


// 👇 --- PERUBAHAN UTAMA DI SINI --- 👇
/**
 * Mengambil merek dari API dengan paginasi dan pencarian.
 * @param page - Nomor halaman
 * @param search - Kata kunci pencarian (opsional)
 */
export const getBrands = async ({ page, search }: { page: number; search: string }): Promise<PaginatedBrands> => {
  const { data } = await api.get('/brands', {
    params: {
      page,
      limit: 10,
      search: search || undefined,
    },
  });
  return data;
};
// 👆 --- AKHIR PERUBAHAN --- 👆

// Create a new brand
export const createBrand = async (data: BrandData): Promise<Brand> => {
  const response = await api.post('/brands', data);
  return response.data;
};

/**
 * Mengambil satu merek berdasarkan ID.
 */
export const getBrandById = async (id: string): Promise<Brand> => {
  const response = await api.get(`/brands/${id}`);
  return response.data;
};

/**
 * Memperbarui data merek berdasarkan ID.
 */
export const updateBrand = async (id: string, data: Partial<BrandData>): Promise<Brand> => {
  const response = await api.patch(`/brands/${id}`, data);
  return response.data;
};

// Delete a brand by its ID
export const deleteBrand = async (id: string): Promise<void> => {
  await api.delete(`/brands/${id}`);
};