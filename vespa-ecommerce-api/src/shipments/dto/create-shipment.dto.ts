// src/shipments/dto/create-shipment.dto.ts

import { IsNotEmpty, IsString } from 'class-validator';

export class CreateShipmentDto {
  @IsString()
  @IsNotEmpty()
  courier_company: string;

  @IsString()
  @IsNotEmpty()
  courier_type: string;
}