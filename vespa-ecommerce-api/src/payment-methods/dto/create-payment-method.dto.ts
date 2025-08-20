import { IsString, IsNotEmpty, IsOptional, IsUrl, IsInt } from 'class-validator';

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

  // ✅ TAMBAHKAN
  @IsInt()
  @IsNotEmpty()
  accurateBankId: number;
}