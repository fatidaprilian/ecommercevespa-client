// pages/services/categoryService.ts
import api from '@/lib/api'; // Pastikan Anda mengimpor instance axios yang benar

export interface Category {
  id: string;
  name: string;
  imageUrl?: string; // Tambahkan imageUrl
}

export interface CategoryData {
  name: string;
  imageUrl?: string; // Tambahkan imageUrl
}

export const getCategories = async (): Promise<Category[]> => {
  const { data } = await api.get('/categories');
  return data;
};

export const createCategory = async (categoryData: CategoryData): Promise<Category> => {
  const { data } = await api.post('/categories', categoryData);
  return data;
};

export const getCategoryById = async (id: string): Promise<Category> => {
  const { data } = await api.get(`/categories/${id}`);
  return data;
};

export const updateCategory = async (id: string, categoryData: Partial<CategoryData>): Promise<Category> => {
  const { data } = await api.patch(`/categories/${id}`, categoryData);
  return data;
};

export const deleteCategory = async (id: string): Promise<void> => {
  await api.delete(`/categories/${id}`);
};