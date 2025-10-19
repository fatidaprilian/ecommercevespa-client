import { IsString, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';

export class CreatePaymentMethodDto {
  @IsString()
  @IsNotEmpty()
  bankName: string;

  @IsString()
  @IsNotEmpty()
  accountHolder: string;

  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsNotEmpty()
  accurateBankName: string;
}
