// src/products/products.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import slugify from 'slugify';
import { Prisma } from '@prisma/client'; // Di-import untuk memberikan tipe pada data update

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Membuat produk baru dan secara otomatis menghasilkan slug dari nama produk.
   */
  async create(createProductDto: CreateProductDto) {
    const slug = slugify(createProductDto.name, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g,
    });

    return this.prisma.product.create({
      data: {
        ...createProductDto,
        slug: slug,
      },
    });
  }

  /**
   * Mengambil semua produk dari database.
   */
  findAll() {
    return this.prisma.product.findMany();
  }

  /**
   * Mencari satu produk berdasarkan ID uniknya.
   * Melempar error jika produk tidak ditemukan.
   */
  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Produk dengan ID "${id}" tidak ditemukan.`);
    }

    return product;
  }

  /**
   * Memperbarui data produk berdasarkan ID.
   * Jika nama produk diubah, slug juga akan diperbarui secara otomatis.
   */
  async update(id: string, updateProductDto: UpdateProductDto) {
    await this.findOne(id); // Memastikan produk ada

    // Memberikan tipe eksplisit `Prisma.ProductUpdateInput`
    // agar TypeScript mengizinkan penambahan properti `slug`.
    const data: Prisma.ProductUpdateInput = { ...updateProductDto };

    // Jika nama produk ada dalam data pembaruan, buat slug baru.
    if (updateProductDto.name) {
      data.slug = slugify(updateProductDto.name, {
        lower: true,
        strict: true,
        remove: /[*+~.()'"!:@]/g,
      });
    }

    return this.prisma.product.update({
      where: { id },
      data,
    });
  }

  /**
   * Menghapus produk berdasarkan ID.
   */
  async remove(id: string) {
    await this.findOne(id); // Memastikan produk ada sebelum menghapus
    
    return this.prisma.product.delete({
      where: { id },
    });
  }
}