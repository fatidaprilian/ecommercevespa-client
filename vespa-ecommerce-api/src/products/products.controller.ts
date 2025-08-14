// file: vespa-ecommerce-api/src/products/products.controller.ts

import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Public } from 'src/auth/decorators/public.decorator'; // <-- 1. IMPORT DECORATOR PUBLIC

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  // Endpoint ini tetap dilindungi, hanya ADMIN yang bisa
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  // --- PERUBAHAN DI SINI ---
  @Public() // <-- 2. Tandai sebagai endpoint publik
  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  // --- PERUBAHAN DI SINI ---
  @Public() // <-- 3. Tandai sebagai endpoint publik juga
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  // Endpoint ini tetap dilindungi, hanya ADMIN yang bisa
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  // Endpoint ini tetap dilindungi, hanya ADMIN yang bisa
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}