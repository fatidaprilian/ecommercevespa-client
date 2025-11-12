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
 * Mengirim data produk baru ke API backend.
 */
export const createProduct = async (productData: ProductData) => {
  const { data } = await api.post<Product>('/products', productData);
  return data;
};

/**
 * Mengupload satu file gambar ke endpoint upload di backend.
 */
export const uploadImage = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await api.post<{ url: string; public_id: string }>('/upload/image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data', // <-- TYPO FIXED
    },
  });
  return data;
};

/**
 * Mengambil produk dari API dengan paginasi dan pencarian.
 * @param page - Nomor halaman yang ingin diambil.
 * @param search - Kata kunci pencarian (opsional).
 * @param includeHidden - Menyertakan produk yang disembunyikan (hanya untuk Admin).
 * @param isVisible - Filter spesifik untuk produk aktif/non-aktif.
 */
interface GetProductsParams {
    page: number;
    search?: string;
    includeHidden?: boolean;
    isVisible?: boolean; // 👈 DITAMBAHKAN
}

export const getProducts = async ({ page, search, includeHidden, isVisible }: GetProductsParams): Promise<PaginatedProducts> => {
  const { data } = await api.get<PaginatedProducts>('/products', {
    params: {
      page,
      limit: 10, 
      search: search || undefined, 
      includeHidden: includeHidden || undefined,
      // 💡 FIX: Konversi isVisible ke string secara eksplisit.
      isVisible: isVisible !== undefined ? String(isVisible) : undefined, // 👈 DIUBAH
    },
  });
  return data;
};

/**
 * Mencari produk berdasarkan kata kunci (untuk picker).
 * @param term - Kata kunci pencarian
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
 * Mengambil satu produk berdasarkan ID.
 */
export const getProductById = async (id: string): Promise<Product> => {
  const { data } = await api.get<Product>(`/products/${id}`);
  return data;
};

/**
 * Memperbarui data produk berdasarkan ID.
 */
export const updateProduct = async (id: string, productData: Partial<ProductData>) => {
  const { data } = await api.patch<Product>(`/products/${id}`, productData);
  return data;
};

/**
 * Menghapus produk berdasarkan ID.
 */
export const deleteProduct = async (id: string) => {
  await api.delete(`/products/${id}`);
};