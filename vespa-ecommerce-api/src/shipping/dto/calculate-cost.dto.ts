// src/shipping/dto/calculate-cost.dto.ts

import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsNumber, IsString, Min, ValidateNested } from 'class-validator';

class ItemDto {
    @IsString() @IsNotEmpty() name: string;
    @IsNumber() @Min(1) value: number;
    @IsInt() @Min(1) quantity: number;
    @IsInt() @Min(1) weight: number;
}

export class CalculateCostDto {
    @IsString() @IsNotEmpty() destination_area_id: string;

    // ✅ TAMBAHKAN FIELD INI
    @IsString() @IsNotEmpty() destination_postal_code: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ItemDto)
    items: ItemDto[];
}