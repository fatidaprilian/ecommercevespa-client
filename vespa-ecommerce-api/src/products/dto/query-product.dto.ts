// file: src/products/dto/query-product.dto.ts
import { IsString, IsOptional, IsIn, IsEnum, IsArray } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryProductDto extends PaginationDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsArray() // Validasi sebagai array
  @IsString({ each: true }) // Setiap elemen dalam array harus string
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