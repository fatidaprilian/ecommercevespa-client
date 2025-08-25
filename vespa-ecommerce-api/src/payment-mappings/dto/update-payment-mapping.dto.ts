import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';

export class UpdatePaymentMappingDto {
  @IsString()
  @IsNotEmpty()
  paymentMethodKey: string;

  @IsString()
  @IsNotEmpty()
  accurateBankName: string;

  @IsInt()
  @IsOptional()
  accurateBankId?: number;

  @IsString()
  @IsNotEmpty()
  accurateBankNo: string;

  @IsString()
  @IsOptional()
  description?: string;
}