// file: src/categories/categories.service.ts

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'; // Ditambahkan ConflictException
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category, Prisma } from '@prisma/client';
import { QueryCategoryDto } from './dto/query-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> { // Ditambahkan async dan await
    try {
      return await this.prisma.category.create({
        data: createCategoryDto,
      });
    } catch (error) {
      // Menangani error duplikat (unique constraint)
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Nama kategori sudah ada.');
      }
      // Lempar error lain jika bukan duplikat
      throw error;
    }
  }

  async findAll(queryDto: QueryCategoryDto) {
    const { page = 1, limit = 10, search } = queryDto;
    const skip = (Number(page) - 1) * Number(limit);

    const where: Prisma.CategoryWhereInput = {};

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const [categories, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.category.count({ where }),
    ]);

    return {
      data: categories,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        lastPage: Math.ceil(total / Number(limit)),
      },
    };
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Kategori dengan ID ${id} tidak ditemukan`);
    }
    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<Category> { // Ditambahkan async dan await
    try {
      return await this.prisma.category.update({
        where: { id },
        data: updateCategoryDto,
      });
    } catch (error) {
       // Menangani error duplikat saat update
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Nama kategori sudah ada.');
      }
      // Menangani jika record tidak ditemukan (P2025)
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Kategori dengan ID ${id} tidak ditemukan.`);
      }
      // Lempar error lain
      throw error;
    }
  }

  async remove(id: string): Promise<Category> {
    const category = await this.findOne(id); // Memastikan kategori ada
    return this.prisma.category.delete({ where: { id: category.id } });
  }
}