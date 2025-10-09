// src/cms-pages/cms-pages.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CmsPagesService } from './cms-pages.service';
import { CreateCmsPageDto } from './dto/create-cms-page.dto';
import { UpdateCmsPageDto } from './dto/update-cms-page.dto';
import { Public } from 'src/auth/decorators/public.decorator';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('pages')
export class CmsPagesController {
  constructor(private readonly cmsPagesService: CmsPagesService) {}

  // Endpoint Publik untuk mengambil data halaman
  @Public()
  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.cmsPagesService.findOneBySlug(slug);
  }

  // Endpoint khusus Admin
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  create(@Body() createCmsPageDto: CreateCmsPageDto) {
    return this.cmsPagesService.create(createCmsPageDto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  findAll() {
    return this.cmsPagesService.findAll();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':slug')
  update(@Param('slug') slug: string, @Body() updateCmsPageDto: UpdateCmsPageDto) {
    return this.cmsPagesService.update(slug, updateCmsPageDto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':slug')
  remove(@Param('slug') slug: string) {
    return this.cmsPagesService.remove(slug);
  }
}