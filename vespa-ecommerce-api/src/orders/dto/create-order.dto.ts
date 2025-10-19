// file: src/orders/dto/create-order.dto.ts

import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum, // <-- TAMBAHKAN IsEnum
  IsNotEmpty,
  IsNumber,
  IsOptional, // <-- TAMBAHKAN IsOptional
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

// <-- TAMBAHKAN ENUM INI (opsional tapi bagus untuk type safety)
export enum PaymentPreference {
  CREDIT_CARD = 'credit_card',
  OTHER = 'other',
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

  // --- TAMBAHAN ---
  @IsOptional()
  @IsEnum(PaymentPreference) // Validasi bahwa nilainya harus 'credit_card' atau 'other'
  paymentPreference?: PaymentPreference; // Tandai sebagai opsional karena Reseller tidak mengirim ini
  // -------------
}