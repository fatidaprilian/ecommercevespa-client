// src/homepage-banners/dto/update-banner.dto.ts

import { PartialType } from '@nestjs/mapped-types';
import { CreateBannerDto } from './create-banner.dto';

export class UpdateBannerDto extends PartialType(CreateBannerDto) {}