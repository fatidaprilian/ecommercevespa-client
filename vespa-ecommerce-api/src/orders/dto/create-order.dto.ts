// file: vespa-ecommerce-api/src/orders/dto/create-order.dto.ts

import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';

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
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsString()
  @IsNotEmpty()
  shippingAddress: string;
  
  @IsString()
  @IsNotEmpty()
  destinationPostalCode: string;

  @IsString()
  @IsNotEmpty()
  destinationAreaId: string;

  @IsNumber()
  @IsNotEmpty()
  shippingCost: number;

  @IsString()
  @IsNotEmpty()
  courier: string;
}