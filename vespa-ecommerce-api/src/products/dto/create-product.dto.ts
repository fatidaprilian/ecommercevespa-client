// file: src/products/dto/create-product.dto.ts

import { IsString, IsNotEmpty, IsNumber, IsInt, IsOptional, Min, IsArray, ValidateNested, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';

class ProductImageDto {
  @IsUrl()
  @IsNotEmpty()
  url: string;
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsInt()
  @Min(0)
  stock: number;
  
  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsString()
  @IsOptional()
  brandId?: string;
  
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  @IsOptional()
  images?: ProductImageDto[];

  @IsInt({ message: 'Berat harus berupa angka bulat (gram).' })
  @Min(1, { message: 'Berat minimal adalah 1 gram.' })
  @IsOptional()
  weight?: number;
}