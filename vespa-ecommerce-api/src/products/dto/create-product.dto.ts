import { IsString, IsNotEmpty, IsNumber, IsInt, IsOptional, Min, IsArray, ValidateNested, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';

// Object untuk setiap gambar
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
  @IsNotEmpty()
  sku: string;

  @IsString() // ID Kategori sekarang string (CUID)
  @IsNotEmpty()
  categoryId: string;

  @IsString() // ID Brand sekarang string (CUID)
  @IsOptional()
  brandId?: string;
  
  // Validasi untuk array of objects
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  @IsOptional()
  images?: ProductImageDto[];
}