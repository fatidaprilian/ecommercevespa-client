// file: src/users/dto/update-profile.dto.ts
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name: string;
}