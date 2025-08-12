import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  create(createCategoryDto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: createCategoryDto,
    });
  }

  findAll() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
  }

  // METHOD YANG HILANG, SEKARANG DITAMBAHKAN
  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException(`Kategori dengan ID ${id} tidak ditemukan`);
    }
    return category;
  }
  
  // METHOD YANG HILANG, SEKARANG DITAMBAHKAN
  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    await this.findOne(id); // Cek apakah kategori ada
    return this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
    });
  }

  // METHOD YANG HILANG, SEKARANG DITAMBAHKAN
  async remove(id: string) {
    await this.findOne(id); // Cek apakah kategori ada
    return this.prisma.category.delete({
      where: { id },
    });
  }
}