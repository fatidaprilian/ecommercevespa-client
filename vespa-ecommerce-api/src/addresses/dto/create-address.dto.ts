// file: vespa-ecommerce-api/src/addresses/dto/create-address.dto.ts

import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class CreateAddressDto {
  @IsString() @IsNotEmpty() street: string;
  @IsString() @IsNotEmpty() postalCode: string;
  @IsString() @IsNotEmpty() provinceId: string;
  @IsString() @IsNotEmpty() province: string;
  @IsString() @IsNotEmpty() cityId: string;
  @IsString() @IsNotEmpty() city: string;
  @IsString() @IsNotEmpty() districtId: string;
  @IsString() @IsNotEmpty() district: string;
  @IsBoolean() @IsOptional() isDefault?: boolean;
}