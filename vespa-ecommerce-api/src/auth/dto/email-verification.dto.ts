// file: src/auth/dto/email-verification.dto.ts

import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class EmailVerificationDto {
  @IsEmail()
  @IsNotEmpty({ message: 'Email tidak boleh kosong.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Kode verifikasi tidak boleh kosong.' })
  @Length(6, 6, { message: 'Kode verifikasi harus 6 digit.' })
  token: string;
}