// file: vespa-ecommerce-web/app/types/index.ts

// Tipe untuk gambar, sesuai dengan respons dari Prisma
export type ProductImage = {
  id: string;
  url: string;
};

export type Category = {
  id: string;
  name: string;
};

export type Brand = {
  id: string;
  name: string;
};

export type Product = {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  price: string; // Prisma Decimal dikirim sebagai string
  stock: number;
  // --- PERUBAHAN DI SINI ---
  images: ProductImage[]; // Menggunakan tipe ProductImage[]
  category: Category;
  brand: Brand | null;
};

// Tipe untuk data pengguna
export type User = {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'RESELLER' | 'MEMBER';
};