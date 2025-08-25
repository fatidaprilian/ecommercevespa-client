// vespa-ecommerce-api/src/brands/brands.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { Prisma } from '@prisma/client';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}

  create(createBrandDto: CreateBrandDto) {
    return this.prisma.brand.create({ data: createBrandDto });
  }

  async findAll(queryDto: PaginationDto & { search?: string }) {
    const { page = 1, limit = 10, search } = queryDto;
    const skip = (Number(page) - 1) * Number(limit);

    const where: Prisma.BrandWhereInput = {};
    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const [brands, total] = await this.prisma.$transaction([
      this.prisma.brand.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { name: 'asc' },
      }),
      this.prisma.brand.count({ where }),
    ]);

    return {
      data: brands,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        lastPage: Math.ceil(total / Number(limit)),
      },
    };
  }

  async findOne(id: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) {
      throw new NotFoundException(`Merek dengan ID ${id} tidak ditemukan.`);
    }
    return brand;
  }

  async update(id: string, updateBrandDto: UpdateBrandDto) {
    await this.findOne(id);
    return this.prisma.brand.update({
      where: { id },
      data: updateBrandDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.brand.delete({ where: { id } });
  }
}