// src/products/dto/query-product.dto.ts
import { Transform } from 'class-transformer';
import { IsString, IsOptional, IsIn, IsEnum, IsArray } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

const transformToArray = ({ value }: { value: string | string[] }): string[] | undefined => {
  if (value && typeof value === 'string') {
    return value.split(',');
  }
  if (Array.isArray(value)) {
    return value;
  }
  return undefined;
};

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