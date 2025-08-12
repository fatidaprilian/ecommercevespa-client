// src/types/index.ts

export interface ICategory {
  id: string;
  name: string;
}

export interface IProduct {
  id: string;
  sku: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  images: string[];
  isActive: boolean;
  categoryId: string;
  category?: ICategory; // Relasi
}