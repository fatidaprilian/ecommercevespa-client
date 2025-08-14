// file: vespa-ecommerce-api/src/cart/dto/add-item.dto.ts

import { IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

export class AddItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  quantity: number;
}