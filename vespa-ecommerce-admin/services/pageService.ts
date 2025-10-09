// services/pageService.ts
import api from '@/lib/api';
import { PaginatedBrands, PaginatedCategories } from '@/types';

// CMS Page Types and Functions
export interface CmsPage {
  slug: string;
  title: string;
  content: string;
  bannerImageUrl?: string;
}

export const createPage = async (payload: Partial<CmsPage>): Promise<CmsPage> => {
  const { data } = await api.post('/pages', payload);
  return data;
};

export const getPages = async (): Promise<CmsPage[]> => {
  const { data } = await api.get('/pages');
  return data;
};

export const getPageBySlug = async (slug: string): Promise<CmsPage> => {
  const { data } = await api.get(`/pages/${slug}`);
  return data;
};

export const updatePage = async (slug: string, payload: Partial<CmsPage>): Promise<CmsPage> => {
  const { data } = await api.patch(`/pages/${slug}`, payload);
  return data;
};

// Revised Category and Brand Functions
interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * Mengambil data kategori dari API dengan paginasi dan pencarian.
 */
export const getCategories = async (params: QueryParams = { limit: 999 }): Promise<PaginatedCategories> => {
  const { data } = await api.get('/categories', { params });
  return data;
};

/**
 * Mengambil data merek dari API dengan paginasi dan pencarian.
 */
export const getBrands = async (params: QueryParams = { limit: 999 }): Promise<PaginatedBrands> => {
  const { data } = await api.get('/brands', { params });
  return data;
};