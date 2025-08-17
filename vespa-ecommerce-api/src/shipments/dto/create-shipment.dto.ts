// file: vespa-ecommerce-api/src/shipments/dto/create-shipment.dto.ts

import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateShipmentDto {
  @IsString()
  @IsNotEmpty({ message: 'Nomor resi tidak boleh kosong.' })
  @MinLength(5, { message: 'Nomor resi terlalu pendek.' })
  trackingNumber: string;
}