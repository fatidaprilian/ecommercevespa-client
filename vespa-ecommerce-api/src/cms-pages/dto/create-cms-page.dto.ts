// src/cms-pages/dto/create-cms-page.dto.ts
import { IsNotEmpty, IsString, IsOptional, IsUrl, Matches } from 'class-validator';

export class CreateCmsPageDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung (-)' })
  slug: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsUrl()
  @IsOptional()
  bannerImageUrl?: string;
}