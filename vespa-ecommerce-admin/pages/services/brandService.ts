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

// Fetch all brands from the API
export const getBrands = async (): Promise<Brand[]> => {
  const response = await api.get('/brands');
  return response.data;
};

// Create a new brand
export const createBrand = async (data: BrandData): Promise<Brand> => {
  const response = await api.post('/brands', data);
  return response.data;
};

// --- TAMBAHKAN FUNGSI DI BAWAH INI ---

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
export const updateBrand = async (id: string, data: BrandData): Promise<Brand> => {
  const response = await api.patch(`/brands/${id}`, data);
  return response.data;
};

// --- FUNGSI HAPUS (SUDAH ADA) ---

// Delete a brand by its ID
export const deleteBrand = async (id: string): Promise<void> => {
  await api.delete(`/brands/${id}`);
};