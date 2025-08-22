// file: src/addresses/dto/create-address.dto.ts

import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsPhoneNumber } from 'class-validator';

export class CreateAddressDto {
  @IsString() @IsNotEmpty() street: string;
  @IsString() @IsNotEmpty() postalCode: string;
  
  @IsPhoneNumber('ID', { message: 'Format nomor telepon tidak valid.' })
  @IsNotEmpty({ message: 'Nomor telepon tidak boleh kosong.' })
  phone: string;

  @IsString() @IsOptional() provinceId?: string;
  @IsString() @IsNotEmpty() province: string;
  @IsString() @IsOptional() cityId?: string;
  @IsString() @IsNotEmpty() city: string;
  @IsString() @IsNotEmpty() districtId: string;
  @IsString() @IsNotEmpty() district: string;
  @IsBoolean() @IsOptional() isDefault?: boolean;
}