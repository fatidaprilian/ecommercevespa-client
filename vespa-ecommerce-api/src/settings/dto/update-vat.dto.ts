// file: vespa-ecommerce-api/src/settings/dto/update-vat.dto.ts

import { IsNotEmpty, IsNumber } from 'class-validator';

export class UpdateVatDto {
  @IsNumber({}, { message: 'Nilai PPN harus berupa angka.' })
  @IsNotEmpty({ message: 'Nilai PPN tidak boleh kosong.' })
  value: number;
}