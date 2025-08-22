// file: vespa-ecommerce-api/src/cart/dto/add-item.dto.ts

import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class AddItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(1) // Kuantitas minimal adalah 1
  quantity: number;
}