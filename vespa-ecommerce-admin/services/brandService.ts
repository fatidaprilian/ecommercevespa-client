import api from '@/lib/api';

export interface Brand {
  id: string;
  name: string;
  logoUrl?: string;
  createdAt: string;
}

export interface BrandData {
  name: string;
  logoUrl?: string;
}

export interface PaginatedBrands {
  data: Brand[];
  meta: {
    total: number;
    page: number;
    limit: number;
    lastPage: number;
  };
}



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

export const deleteBrand = async (id: string): Promise<void> => {
  await api.delete(`/brands/${id}`);
};