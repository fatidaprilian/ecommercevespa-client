import { IsString, IsOptional, IsIn, IsEnum } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto'; // Sesuaikan path jika perlu

export class QueryProductDto extends PaginationDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  brandId?: string;
  
  @IsOptional()
  @IsEnum(['price', 'createdAt'])
  sortBy?: 'price' | 'createdAt' = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}