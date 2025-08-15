// file: vespa-ecommerce-api/src/cart/dto/update-item.dto.ts

import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class UpdateItemDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(1) // Kuantitas tidak boleh kurang dari 1
  quantity: number;
}