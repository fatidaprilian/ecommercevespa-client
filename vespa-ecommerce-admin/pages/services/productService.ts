// file: vespa-ecommerce-admin/pages/services/productService.ts

import api from '@/lib/api'; // Menggunakan instance axios yang sudah dikonfigurasi

// Tipe data untuk payload produk sesuai schema.prisma
export interface ProductData {
  name: string;
  sku: string;
  price: number;
  stock: number;
  description?: string;
  categoryId: string;
  brandId?: string;
  images?: { url: string }[];
}

/**
 * Mengirim data produk baru ke API backend.
 * @param productData - Objek yang berisi data produk baru.
 */
export const createProduct = async (productData: ProductData) => {
  const { data } = await api.post('/products', productData);
  return data;
};

/**
 * Mengupload satu file gambar ke endpoint upload di backend.
 * @param file - File gambar yang akan di-upload.
 */
export const uploadImage = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data; // API diharapkan mengembalikan { url: '...' }
};

// --- Fungsi untuk halaman Edit (akan kita tambahkan nanti) ---

/**
 * Mengambil semua produk dari API.
 */
export const getProducts = async () => {
  const { data } = await api.get('/products');
  return data;
};

/**
 * Mengambil satu produk berdasarkan ID.
 */
export const getProductById = async (id: string) => {
  const { data } = await api.get(`/products/${id}`);
  return data;
};

/**
 * Memperbarui data produk berdasarkan ID.
 */
export const updateProduct = async (id: string, productData: ProductData) => {
  const { data } = await api.patch(`/products/${id}`, productData);
  return data;
};

/**
 * Menghapus produk berdasarkan ID.
 */
export const deleteProduct = async (id: string) => {
  await api.delete(`/products/${id}`);
};