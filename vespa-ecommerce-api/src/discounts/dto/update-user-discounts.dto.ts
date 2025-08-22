// file: src/discounts/dto/update-user-discounts.dto.ts

import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

// DTO untuk Aturan #2: Diskon per Kategori
class UserCategoryDiscountDto {
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsNumber()
  @Min(0)
  discountPercentage: number;
}

// DTO untuk Aturan #1: Diskon per Produk
class UserProductDiscountDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @Min(0)
  discountPercentage: number;
}

export class UpdateUserDiscountsDto {
  // DTO untuk Aturan #3: Diskon Dasar
  @IsNumber()
  @IsOptional()
  @Min(0)
  defaultDiscountPercentage?: number;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UserCategoryDiscountDto)
  categoryDiscounts?: UserCategoryDiscountDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UserProductDiscountDto)
  productDiscounts?: UserProductDiscountDto[];
}