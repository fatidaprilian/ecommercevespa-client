// file: src/products/dto/search-product.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class SearchProductDto {
  @IsString()
  @IsOptional()
  term?: string;
}