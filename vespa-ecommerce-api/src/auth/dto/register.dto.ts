// file: vespa-ecommerce-api/src/auth/dto/register.dto.ts

import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty({ message: 'Email tidak boleh kosong' })
  @IsEmail({}, { message: 'Format email tidak valid' })
  email: string;

  @IsNotEmpty({ message: 'Password tidak boleh kosong' })
  @IsString()
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  password: string;

  @IsNotEmpty({ message: 'Nama tidak boleh kosong' })
  @IsString()
  name: string;
}