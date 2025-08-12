// src/products/dto/create-product.dto.ts
export class CreateProductDto {
  name: string;
  sku: string;
  description?: string;
  price: number;
  stock: number;
  images: string[];
  isActive?: boolean;
  categoryId: string;
}