// src/auth/dto/login.dto.ts
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Format email tidak valid.' }) // Ditambahkan validasi email
  @IsNotEmpty({ message: 'Email tidak boleh kosong.' }) // Ditambahkan validasi tidak kosong
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password tidak boleh kosong.' }) // Ditambahkan validasi tidak kosong
  @MinLength(8, { message: 'Password minimal 8 karakter.' }) // Ditambahkan validasi panjang minimal
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'CAPTCHA token tidak boleh kosong.' }) // Ditambahkan validasi
  turnstileToken: string; // Properti baru ditambahkan
}