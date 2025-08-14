// File: vespa-ecommerce-api/src/brands/dto/update-brand.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateBrandDto } from './create-brand.dto';

export class UpdateBrandDto extends PartialType(CreateBrandDto) {}
