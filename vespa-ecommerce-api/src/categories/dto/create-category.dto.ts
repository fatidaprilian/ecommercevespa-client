// src/categories/dto/create-category.dto.ts
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @IsNotEmpty({ message: 'Nama kategori tidak boleh kosong.' })
  @IsString({ message: 'Nama harus berupa string.' })
  @MinLength(3, { message: 'Nama kategori minimal 3 karakter.' })
  name: string;
}