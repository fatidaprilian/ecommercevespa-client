// file: src/discounts/dto/add-discount-rule.dto.ts

import { IsIn, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class AddDiscountRuleDto {
  @IsIn(['product', 'category'])
  @IsNotEmpty()
  type: 'product' | 'category';

  @IsString()
  @IsNotEmpty()
  ruleId: string;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  discountPercentage: number;
}