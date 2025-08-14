// vespa-ecommerce-api/src/brands/brands.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}

  // Membuat merek baru
  create(createBrandDto: CreateBrandDto) {
    return this.prisma.brand.create({ data: createBrandDto });
  }

  // Mendapatkan semua merek
  findAll() {
    return this.prisma.brand.findMany({ orderBy: { name: 'asc' } });
  }

  // Mendapatkan satu merek berdasarkan ID
  async findOne(id: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) {
      throw new NotFoundException(`Merek dengan ID ${id} tidak ditemukan.`);
    }
    return brand;
  }

  // Memperbarui merek berdasarkan ID
  async update(id: string, updateBrandDto: UpdateBrandDto) {
    await this.findOne(id); // Memastikan merek ada sebelum update
    return this.prisma.brand.update({
      where: { id },
      data: updateBrandDto,
    });
  }

  // Menghapus merek berdasarkan ID
  async remove(id: string) {
    await this.findOne(id); // Memastikan merek ada sebelum dihapus
    return this.prisma.brand.delete({ where: { id } });
  }
}
