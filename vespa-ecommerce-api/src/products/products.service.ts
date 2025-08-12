import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Pastikan path benar
import { CreateProductDto } from './dto/create-product.dto';
import { Product, Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const { categoryId, brandId, images, ...productData } = createProductDto;

    const data: Prisma.ProductCreateInput = {
      ...productData,
      category: {
        connect: { id: categoryId },
      },
      // Hubungkan brand jika ada
      ...(brandId && { brand: { connect: { id: brandId } } }),
      // Buat entri gambar terkait jika ada
      ...(images && { images: { create: images } }),
    };

    return this.prisma.product.create({
      data,
      include: {
        category: true,
        brand: true,
        images: true,
      },
    });
  }

  async findAll(): Promise<Product[]> {
    return this.prisma.product.findMany({
      include: {
        category: true,
        brand: true,
        images: true,
      },
    });
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        brand: true,
        images: true,
      },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async update(id: string, updateProductDto: Partial<CreateProductDto>): Promise<Product> {
    const { categoryId, brandId, images, ...productData } = updateProductDto;

    // Prisma transaction untuk memastikan update dan delete/create image atomik
    return this.prisma.$transaction(async (tx) => {
      const updatedProduct = await tx.product.update({
        where: { id },
        data: {
          ...productData,
          ...(categoryId && { category: { connect: { id: categoryId } } }),
          ...(brandId && { brand: { connect: { id: brandId } } }),
        },
      });

      if (images) {
        // Hapus semua gambar lama
        await tx.productImage.deleteMany({ where: { productId: id } });
        // Tambahkan gambar baru
        await tx.product.update({
          where: { id },
          data: {
            images: {
              create: images,
            },
          },
        });
      }
      
      // Ambil data produk final dengan semua relasi
      return tx.product.findUniqueOrThrow({
        where: { id },
        include: {
          category: true,
          brand: true,
          images: true,
        }
      });
    });
  }

  async remove(id: string): Promise<Product> {
    // Pastikan produk ada sebelum dihapus
    await this.findOne(id);
    // onDelete: Cascade pada ProductImage akan menghapus gambar terkait secara otomatis
    return this.prisma.product.delete({
      where: { id },
    });
  }
}