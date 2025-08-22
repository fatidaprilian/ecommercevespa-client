// src/products/dto/query-product.dto.ts
import { Transform } from 'class-transformer';
import { IsString, IsOptional, IsIn, IsEnum, IsArray } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

// 👇 --- PERUBAHAN UTAMA DI SINI --- 👇
// Helper function to handle both comma-separated strings and multiple query params
const transformToArray = ({ value }: { value: string | string[] }): string[] | undefined => {
  if (value && typeof value === 'string') {
    // Jika nilainya adalah string, pecah berdasarkan koma menjadi array
    return value.split(',');
  }
  if (Array.isArray(value)) {
    // Jika sudah berupa array, langsung kembalikan
    return value;
  }
  // Kembalikan undefined jika tidak ada nilai
  return undefined;
};
// 👆 --- AKHIR PERUBAHAN --- 👆

export class QueryProductDto extends PaginationDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(transformToArray)
  categoryId?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(transformToArray)
  brandId?: string[];

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['price', 'createdAt'])
  sortBy?: 'price' | 'createdAt' = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}