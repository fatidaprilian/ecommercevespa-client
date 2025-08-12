// src/orders/dto/create-order.dto.ts

import { IsArray, IsNotEmpty, IsNumber, IsString } from 'class-validator';

class OrderItemDto {
  @IsNotEmpty()
  @IsString()
  productId: string;

  @IsNotEmpty()
  @IsNumber()
  quantity: number;
}

export class CreateOrderDto {
  @IsArray()
  @IsNotEmpty()
  items: OrderItemDto[];
}