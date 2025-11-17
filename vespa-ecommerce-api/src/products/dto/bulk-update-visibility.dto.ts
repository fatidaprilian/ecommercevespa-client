// src/products/dto/bulk-update-visibility.dto.ts

import { IsArray, IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class BulkUpdateVisibilityDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  productIds: string[];

  @IsBoolean()
  @IsNotEmpty()
  isVisible: boolean;
}