// vespa-ecommerce-web/src/types/index.ts

export type Category = {
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
  images: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  categoryId: string;
  category: Category;
};

// Tipe untuk data pengguna
export type User = {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'RESELLER' | 'MEMBER';
};