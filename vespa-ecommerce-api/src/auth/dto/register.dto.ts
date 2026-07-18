// file: vespa-ecommerce-api/src/auth/dto/register.dto.ts

import { IsEmail, IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty({ message: 'Email tidak boleh kosong' })
  @IsEmail({}, { message: 'Format email tidak valid' })
  email: string;

  @IsNotEmpty({ message: 'Password tidak boleh kosong' })
  @IsString()
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Password harus mengandung huruf besar, huruf kecil, dan angka/karakter spesial',
  })
  password: string;

  @IsNotEmpty({ message: 'Nama tidak boleh kosong' })
  @IsString()
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'CAPTCHA token tidak boleh kosong.' }) // Validasi ditambahkan
  turnstileToken: string; // Properti baru ditambahkan
}