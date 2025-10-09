// src/cms-pages/dto/update-cms-page.dto.ts
import { IsString, IsOptional, IsUrl } from 'class-validator';

export class UpdateCmsPageDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsUrl()
  @IsOptional()
  bannerImageUrl?: string;
}