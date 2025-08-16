// file: src/products/products.controller.ts

import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Req } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard'; // <-- Guard utama kita
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Public } from 'src/auth/decorators/public.decorator';
import { QueryProductDto } from './dto/query-product.dto';
import { SearchProductDto } from './dto/search-product.dto';
import { AuthenticatedRequest } from 'src/auth/interfaces/authenticated-request.interface';

@Controller('products')
@UseGuards(JwtAuthGuard) // <-- Terapkan guard di level controller
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public() // Endpoint ini tetap bisa diakses publik
  @Get('search')
  searchProducts(@Query() query: SearchProductDto) {
    return this.productsService.search(query.term || '');
  }

  @Post()
  @UseGuards(RolesGuard) // Tambahan guard untuk role
  @Roles(Role.ADMIN)
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  // ✅ KUNCI PERBAIKAN: Endpoint ini sekarang opsional terautentikasi
  @Public()
  @Get()
  findAll(@Query() queryProductDto: QueryProductDto, @Req() req: AuthenticatedRequest) {
    // Kirim 'req.user' (yang bisa jadi null) ke service
    return this.productsService.findAll(queryProductDto, req.user);
  }

  // ✅ KUNCI PERBAIKAN: Endpoint ini juga opsional terautentikasi
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    // Kirim 'req.user' (yang bisa jadi null) ke service
    return this.productsService.findOne(id, req.user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}