// file: vespa-ecommerce-api/src/settings/dto/update-multiple-settings.dto.ts

import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsString, ValidateNested } from 'class-validator';

class SettingDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  value: string;
}

export class UpdateMultipleSettingsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettingDto)
  settings: SettingDto[];
}