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
  
  // --- PERUBAHAN DI SINI: SKU SEKARANG OPSIONAL ---
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
}