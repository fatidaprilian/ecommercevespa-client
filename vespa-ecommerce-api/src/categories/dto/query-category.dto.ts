// file: src/categories/dto/query-category.dto.ts

import { IsOptional, IsString, IsNumberString } from 'class-validator';

export class QueryCategoryDto {
  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  @IsString()
  search?: string;
}