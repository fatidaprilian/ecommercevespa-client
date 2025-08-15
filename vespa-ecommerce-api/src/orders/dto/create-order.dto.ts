// file: vespa-ecommerce-api/src/orders/dto/create-order.dto.ts

import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';

// Mendefinisikan struktur objek yang valid di dalam array 'items'
class OrderItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @IsNotEmpty()
  quantity: number;
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true }) // Terapkan validasi OrderItemDto ke setiap objek dalam array
  @Type(() => OrderItemDto) // Bantu NestJS mengubah payload menjadi class
  items: OrderItemDto[];

  @IsString()
  @IsNotEmpty()
  shippingAddress: string;

  @IsNumber()
  @IsNotEmpty()
  shippingCost: number;

  @IsString()
  @IsNotEmpty()
  courier: string;
}