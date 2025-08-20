import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';

export class CreatePaymentMappingDto {
  @IsString()
  @IsNotEmpty()
  paymentMethodKey: string;

  @IsString()
  @IsNotEmpty()
  accurateBankName: string;

  // ✅ TAMBAHKAN
  @IsInt()
  @IsNotEmpty()
  accurateBankId: number;

  @IsString()
  @IsOptional()
  description?: string;
}