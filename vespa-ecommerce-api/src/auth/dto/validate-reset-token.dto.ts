// file: src/auth/dto/validate-reset-token.dto.ts

import { IsNotEmpty, IsString, Length } from 'class-validator';

export class ValidateResetTokenDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Kode reset harus 6 digit.' })
  token: string;
}