// file: src/products/dto/query-product.dto.ts

import { Transform } from 'class-transformer';
import { IsString, IsOptional, IsIn, IsEnum, IsArray } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryProductDto extends PaginationDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  // --- AWAL PERBAIKAN ---
  // Logika diubah untuk menerima string tunggal dari query URL
  // dan mengubahnya menjadi array secara otomatis.
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').filter(item => item.trim() !== ''); // Mendukung ?brandId=id1,id2
    }
    if (Array.isArray(value)) {
      return value;
    }
    // Jika hanya satu string (bukan array) yang dikirim
    return [value];
  })
  brandId?: string[];
  // --- AKHIR PERBAIKAN ---

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