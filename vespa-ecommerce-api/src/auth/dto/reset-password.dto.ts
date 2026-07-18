// file: src/auth/dto/reset-password.dto.ts

// --- TAMBAHKAN 'Length' DI SINI ---
import { IsNotEmpty, IsString, MinLength, Matches, Length } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Kode reset harus 6 digit.' })
  token: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Password harus mengandung huruf besar, huruf kecil, dan angka/karakter spesial',
  })
  password: string;
}