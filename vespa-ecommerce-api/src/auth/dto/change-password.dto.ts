import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsNotEmpty({ message: 'Password lama wajib diisi' })
  @IsString()
  oldPassword: string;

  @IsNotEmpty({ message: 'Password baru wajib diisi' })
  @IsString()
  @MinLength(8, { message: 'Password baru minimal 8 karakter' })
  newPassword: string;
}
