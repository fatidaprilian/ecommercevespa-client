// vespa-ecommerce-api/src/brands/brands.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards, // Impor UseGuards
} from '@nestjs/common';
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard'; // Impor guard
import { RolesGuard } from '../common/guards/roles.guard'; // Impor guard
import { Roles } from '../common/decorators/roles.decorator'; // Impor decorator
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard) // Terapkan guard ke semua route di controller ini
@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Post()
  @Roles(Role.ADMIN) // Hanya ADMIN yang bisa membuat
  create(@Body() createBrandDto: CreateBrandDto) {
    return this.brandsService.create(createBrandDto);
  }

  @Get()
  findAll() {
    return this.brandsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.brandsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN) // Hanya ADMIN yang bisa update
  update(@Param('id') id: string, @Body() updateBrandDto: UpdateBrandDto) {
    return this.brandsService.update(id, updateBrandDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN) // Hanya ADMIN yang bisa menghapus
  remove(@Param('id') id: string) {
    return this.brandsService.remove(id);
  }
}