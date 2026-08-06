// services/productService.ts

import api from '@/lib/api'; 

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  weight?: number;
  description?: string;
  categoryId: string;
  brandId?: string;
  images?: { url: string }[];
  createdAt: string;
  updatedAt: string;
  isVisible: boolean;
  isFeatured?: boolean;
  isSecondaryFeatured?: boolean;
  category?: any;
  piaggioCode?: string;
  models?: string;
}

export interface PaginatedProducts {
  data: Product[];
  meta: {
    total: number;
    page: number;
    limit: number;
    lastPage: number;
  };
}

export interface ProductData {
  name: string;
  price: number;
  stock: number;
  weight?: number;
  categoryId: string;
  description?: string;
  brandId?: string;
  images?: { url: string }[];
  sku?: string;
  isVisible?: boolean;
}

/**
 * Creates a new product record in the backend API.
 */
export const createProduct = async (productData: ProductData) => {
  const { data } = await api.post<Product>('/products', productData);
  return data;
};

/**
 * Uploads an image file to the backend upload endpoint.
 */
export const uploadImage = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await api.post<{ url: string; public_id: string }>('/upload/image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
};

/**
 * Fetches products from the API with pagination and optional search filter.
 * @param page - Page number to retrieve.
 * @param search - Search keyword (optional).
 * @param includeHidden - Whether to include hidden products (Admin only).
 * @param isVisible - Specific filter for active/inactive products.
 */
interface GetProductsParams {
    page: number;
    search?: string;
    includeHidden?: boolean;
    isVisible?: boolean;
}

export const getProducts = async ({ page, search, includeHidden, isVisible }: GetProductsParams): Promise<PaginatedProducts> => {
  const { data } = await api.get<PaginatedProducts>('/products', {
    params: {
      page,
      limit: 10, 
      search: search || undefined, 
      includeHidden: includeHidden || undefined,
      isVisible: isVisible !== undefined ? String(isVisible) : undefined,
    },
  });
  return data;
};

/**
 * Searches products by keyword (for product picker components).
 * @param term - Search keyword
 */
export const searchProducts = async (term: string): Promise<Product[]> => {
  if (term.length < 2) {
    return [];
  }
  const { data } = await api.get<Product[]>(`/products/search`, {
    params: { term },
  });
  return data;
};

/**
 * Fetches a single product by its unique ID.
 */
export const getProductById = async (id: string): Promise<Product> => {
  const { data } = await api.get<Product>(`/products/${id}`);
  return data;
};

/**
 * Updates an existing product by its unique ID.
 */
export const updateProduct = async (id: string, productData: Partial<ProductData>) => {
  const { data } = await api.patch<Product>(`/products/${id}`, productData);
  return data;
};

/**
 * Deletes a product by its unique ID.
 */
export const deleteProduct = async (id: string) => {
  await api.delete(`/products/${id}`);
};

/**
 * Bulk updates the visibility status for multiple products simultaneously.
 */
export const bulkUpdateProductVisibility = async (data: {
  productIds: string[];
  isVisible: boolean;
}): Promise<{ message: string; count: number }> => {
  const response = await api.patch('/products/bulk-visible', data);
  return response.data;
};