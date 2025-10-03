// src/homepage-banners/homepage-banners.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { UploadService } from 'src/upload/upload.service';

@Injectable()
export class HomepageBannersService {
  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
  ) {}

  create(createBannerDto: CreateBannerDto) {
    return this.prisma.homePageBanner.create({
      data: createBannerDto,
    });
  }

  findAll() {
    return this.prisma.homePageBanner.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  findAllActive() {
    return this.prisma.homePageBanner.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const banner = await this.prisma.homePageBanner.findUnique({
      where: { id },
    });
    if (!banner) {
      throw new NotFoundException(`Banner dengan ID ${id} tidak ditemukan.`);
    }
    return banner;
  }

  async update(id: string, updateBannerDto: UpdateBannerDto) {
    const existingBanner = await this.findOne(id);

    if (updateBannerDto.imageUrl && updateBannerDto.imageUrl !== existingBanner.imageUrl) {
      await this.uploadService.deleteImageFromCloudinary(existingBanner.imageUrl);
    }

    return this.prisma.homePageBanner.update({
      where: { id },
      data: updateBannerDto,
    });
  }

  async remove(id: string) {
    const banner = await this.findOne(id);

    if (banner.imageUrl) {
      await this.uploadService.deleteImageFromCloudinary(banner.imageUrl);
    }

    return this.prisma.homePageBanner.delete({
      where: { id },
    });
  }
}