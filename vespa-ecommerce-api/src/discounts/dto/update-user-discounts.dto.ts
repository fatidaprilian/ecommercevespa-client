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

class UserCategoryDiscountDto {
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsNumber()
  @Min(0)
  discountPercentage: number;
}

class UserProductDiscountDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @Min(0)
  discountPercentage: number;
}

export class UpdateUserDiscountsDto {
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