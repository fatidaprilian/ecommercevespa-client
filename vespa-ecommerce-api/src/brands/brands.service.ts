// vespa-ecommerce-api/src/brands/brands.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'; // Ditambahkan ConflictException
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { Prisma, Brand } from '@prisma/client'; // Ditambahkan Brand dan Prisma
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}

  async create(createBrandDto: CreateBrandDto): Promise<Brand> { // Ditambahkan return type Promise<Brand> dan async
    try {
      return await this.prisma.brand.create({ data: createBrandDto }); // Ditambahkan await
    } catch (error) {
      // Menangani error duplikat
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Nama merek sudah ada.');
      }
      // Lempar error lain jika bukan duplikat
      throw error;
    }
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

  async findOne(id: string): Promise<Brand> { // Ditambahkan return type Promise<Brand>
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) {
      throw new NotFoundException(`Merek dengan ID ${id} tidak ditemukan.`);
    }
    return brand;
  }

  async update(id: string, updateBrandDto: UpdateBrandDto): Promise<Brand> { // Ditambahkan return type Promise<Brand>
    // findOne sudah ada di bawah, jadi tidak perlu di sini lagi
    try {
      return await this.prisma.brand.update({ // Ditambahkan await
        where: { id },
        data: updateBrandDto,
      });
    } catch (error) {
       // Menangani error duplikat saat update
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Nama merek sudah ada.');
      }
      // Menangani jika record tidak ditemukan (P2025)
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Merek dengan ID ${id} tidak ditemukan.`);
      }
      // Lempar error lain
      throw error;
    }
  }

  async remove(id: string): Promise<Brand> { // Ditambahkan return type Promise<Brand>
    await this.findOne(id); // Memastikan brand ada sebelum dihapus
    // Tidak perlu try-catch di sini karena findOne sudah menangani NotFound,
    // dan delete jarang menyebabkan P2002. Jika perlu, bisa ditambahkan.
    return this.prisma.brand.delete({ where: { id } });
  }
}