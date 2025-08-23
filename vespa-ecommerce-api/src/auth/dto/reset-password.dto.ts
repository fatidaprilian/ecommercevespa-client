// file: src/auth/dto/reset-password.dto.ts

// --- TAMBAHKAN 'Length' DI SINI ---
import { IsNotEmpty, IsString, MinLength, Length } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Kode reset harus 6 digit.' })
  token: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password baru minimal 8 karakter.' })
  password: string;
}