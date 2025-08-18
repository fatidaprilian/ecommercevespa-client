// file: pages/services/productService.ts

import api from '@/lib/api'; // Menggunakan instance axios yang sudah dikonfigurasi

// ====================================================================
// Tipe Data (Types)
// ====================================================================

// Tipe data untuk satu produk, harus cocok dengan data yang dikirim API
export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  description?: string;
  categoryId: string;
  brandId?: string;
  images?: { url: string }[];
  createdAt: string;
  updatedAt: string;
}

// Tipe data untuk struktur respons paginasi dari API
export interface PaginatedProducts {
  data: Product[];
  meta: {
    total: number;
    page: number;
    limit: number;
    lastPage: number;
  };
}

// Tipe data untuk payload saat membuat/memperbarui produk
export interface ProductData {
  name: string;
  price: number;
  stock: number;
  categoryId: string;
  description?: string;
  brandId?: string;
  images?: { url: string }[];
  sku?: string; 
}

// ====================================================================
// Fungsi-fungsi Service
// ====================================================================

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

  const { data } = await api.post<{ url: string; public_id: string }>('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
};

/**
 * Mengambil semua produk dari API dengan struktur paginasi.
 * Versi ini mengambil semua produk sekaligus (sesuai permintaan revisi).
 */
export const getProducts = async (): Promise<PaginatedProducts> => {
  const { data } = await api.get<PaginatedProducts>('/products');
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