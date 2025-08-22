// File: vespa-ecommerce-api/src/brands/dto/create-brand.dto.ts
import { IsNotEmpty, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class CreateBrandDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Logo URL harus berupa URL yang valid.' })
  logoUrl?: string;
}