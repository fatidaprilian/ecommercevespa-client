// src/cms-pages/cms-pages.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCmsPageDto } from './dto/create-cms-page.dto';
import { UpdateCmsPageDto } from './dto/update-cms-page.dto';

@Injectable()
export class CmsPagesService {
  constructor(private prisma: PrismaService) {}

  create(createCmsPageDto: CreateCmsPageDto) {
    return this.prisma.cmsPage.create({ data: createCmsPageDto });
  }

  findAll() {
    return this.prisma.cmsPage.findMany({ orderBy: { title: 'asc' } });
  }

  async findOneBySlug(slug: string) {
    const page = await this.prisma.cmsPage.findUnique({ where: { slug } });
    if (!page) {
      throw new NotFoundException(`Halaman dengan slug "${slug}" tidak ditemukan.`);
    }
    return page;
  }

  async update(slug: string, updateCmsPageDto: UpdateCmsPageDto) {
    await this.findOneBySlug(slug);
    return this.prisma.cmsPage.update({
      where: { slug },
      data: updateCmsPageDto,
    });
  }

  async remove(slug: string) {
    await this.findOneBySlug(slug);
    return this.prisma.cmsPage.delete({ where: { slug } });
  }
}