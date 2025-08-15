// file: vespa-ecommerce-api/src/products/products.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { Product, Prisma } from '@prisma/client';
import { QueryProductDto } from './dto/query-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const { categoryId, brandId, images, ...productData } = createProductDto;

    // --- PERBAIKAN UTAMA: GENERATE SKU OTOMATIS ---
    // Buat SKU dari 3 huruf pertama nama produk + timestamp unik
    const skuPrefix = productData.name.substring(0, 3).toUpperCase();
    const uniqueTimestamp = Date.now().toString().slice(-6);
    const generatedSku = `${skuPrefix}-${uniqueTimestamp}`;

    const data: Prisma.ProductCreateInput = {
      ...productData,
      sku: generatedSku, // Gunakan SKU yang baru dibuat
      category: {
        connect: { id: categoryId },
      },
      ...(brandId && { brand: { connect: { id: brandId } } }),
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

  async findAll(queryDto: QueryProductDto) {
    const { 
      page = 1, 
      limit = 10, 
      categoryId, 
      brandId, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = queryDto;
    
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (brandId) {
      where.brandId = brandId;
    }

    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: true,
          brand: true,
          images: true,
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  // ... metode findOne, update, remove tidak berubah ...
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

    return this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          ...productData,
          ...(categoryId && { category: { connect: { id: categoryId } } }),
          ...(brandId && { brand: { connect: { id: brandId } } }),
        },
      });

      if (images) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        await tx.product.update({
          where: { id },
          data: {
            images: {
              create: images,
            },
          },
        });
      }

      return tx.product.findUniqueOrThrow({
        where: { id },
        include: {
          category: true,
          brand: true,
          images: true,
        },
      });
    });
  }

  async remove(id: string): Promise<Product> {
    await this.findOne(id);
    return this.prisma.product.delete({
      where: { id },
    });
  }
}