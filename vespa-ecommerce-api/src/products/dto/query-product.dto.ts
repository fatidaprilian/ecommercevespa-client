import { Transform } from 'class-transformer';
import { IsString, IsOptional, IsIn, IsEnum, IsArray } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

// Helper function to reliably convert incoming query params to an array
const transformToArray = ({ value }: { value: string | string[] }): string[] | undefined => {
  // If the value is a single string, put it into an array
  if (value && typeof value === 'string') {
    return [value];
  }
  // If it's already an array, just return it
  if (Array.isArray(value)) {
    return value;
  }
  // Return undefined if no value is provided
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
  @Transform(transformToArray) // <-- PERBAIKAN UTAMA DI SINI
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