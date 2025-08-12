// src/payments/dto/create-payment.dto.ts

import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsString()
  @IsNotEmpty()
  paymentMethod: string; // e.g., 'XENDIT_VA', 'MANUAL_TRANSFER'
}