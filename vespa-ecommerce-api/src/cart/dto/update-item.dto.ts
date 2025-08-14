// file: vespa-ecommerce-api/src/cart/dto/update-item.dto.ts

import { IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class UpdateItemDto {
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  quantity: number;
}