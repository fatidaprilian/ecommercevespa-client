// src/products/products.controller.ts

import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Req } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Public } from 'src/auth/decorators/public.decorator';
import { QueryProductDto } from './dto/query-product.dto';
import { SearchProductDto } from './dto/search-product.dto';
import { AuthenticatedRequest } from 'src/auth/interfaces/authenticated-request.interface';
// <-- IMPORT DTO BARU
import { BulkUpdateVisibilityDto } from './dto/bulk-update-visibility.dto';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Public()
  @Get()
  findAll(@Query() queryProductDto: QueryProductDto, @Req() req: AuthenticatedRequest) {
    return this.productsService.findAll(queryProductDto, req.user);
  }

  // =======================================================
  // DIUBAH: Endpoint sekarang menerima informasi user
  // =======================================================
  @Public()
  @Get('featured')
  findFeatured(@Req() req: AuthenticatedRequest) {
    return this.productsService.findFeatured(req.user);
  }

  @Public()
  @Get('search')
  searchProducts(@Query() query: SearchProductDto) {
    return this.productsService.search(query.term || '');
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.productsService.findOne(id, req.user);
  }

  @Public()
  @Get(':id/related')
  findRelated(
    @Param('id') id: string, 
    @Query('type') type: 'brand' | 'category',
    @Req() req: AuthenticatedRequest
  ) {
    return this.productsService.findRelated(id, type, req.user);
  }

  // +++ ENDPOINT BARU UNTUK BULK UPDATE +++
  @Patch('bulk-visible')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  bulkUpdateVisibility(
    @Body() bulkUpdateVisibilityDto: BulkUpdateVisibilityDto,
  ) {
    return this.productsService.bulkUpdateVisibility(bulkUpdateVisibilityDto);
  }
  // +++ AKHIR ENDPOINT BARU +++

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