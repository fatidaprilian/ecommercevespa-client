// src/homepage-banners/dto/create-banner.dto.ts

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  IsEnum,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { BannerType } from '@prisma/client';

export class CreateBannerDto {
  @IsString()
  @IsOptional()
  @MaxLength(40)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  subtitle?: string;

  @IsUrl()
  @IsNotEmpty()
  imageUrl: string;

  @IsString()
  @IsOptional()
  linkUrl?: string;

  @IsEnum(BannerType)
  @IsNotEmpty()
  type: BannerType;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  brandId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  buttonText?: string;

  @IsString()
  @IsOptional()
  textColor?: string;

  @IsString()
  @IsOptional()
  buttonColor?: string;
}