
import api from '@/lib/api';



export interface Category {
  id: string;
  name: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedCategories {
  data: Category[];
  meta: {
    total: number;
    page: number;
    limit: number;
    lastPage: number;
  };
}

export interface CategoryData {
  name: string;
  imageUrl?: string;
}



/**
 * Mengambil kategori dari API dengan paginasi dan pencarian.
 * @param page - Nomor halaman yang ingin diambil.
 * @param search - Kata kunci pencarian (opsional).
 */
export const getCategories = async ({ page, search }: { page: number; search: string }): Promise<PaginatedCategories> => {
  const { data } = await api.get<PaginatedCategories>('/categories', {
    params: {
      page,
      limit: 10,
      search: search || undefined,
    },
  });
  return data;
};

/**
 * Mengirim data kategori baru ke API backend.
 */
export const createCategory = async (categoryData: CategoryData): Promise<Category> => {
  const { data } = await api.post<Category>('/categories', categoryData);
  return data;
};

/**
 * Mengambil satu kategori berdasarkan ID.
 */
export const getCategoryById = async (id: string): Promise<Category> => {
  const { data } = await api.get<Category>(`/categories/${id}`);
  return data;
};

/**
 * Memperbarui data kategori berdasarkan ID.
 */
export const updateCategory = async (id: string, categoryData: Partial<CategoryData>): Promise<Category> => {
  const { data } = await api.patch<Category>(`/categories/${id}`, categoryData);
  return data;
};

/**
 * Menghapus kategori berdasarkan ID.
 */
export const deleteCategory = async (id: string): Promise<void> => {
  await api.delete(`/categories/${id}`);
};