// src/homepage-banners/dto/create-banner.dto.ts

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl, // Pastikan ini diimpor dengan benar
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { BannerType } from '@prisma/client';

export class CreateBannerDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  subtitle?: string;

  // --- PERUBAHAN DI SINI ---
  @IsUrl() // Mengganti @Url() menjadi @IsUrl()
  @IsNotEmpty()
  imageUrl: string;
  // --- SELESAI ---

  @IsString()
  @IsOptional()
  linkUrl?: string;

  @IsEnum(BannerType)
  @IsNotEmpty()
  type: BannerType;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}