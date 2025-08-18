// src/products/products.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { Product, Prisma, Role } from '@prisma/client';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { DiscountsCalculationService } from 'src/discounts/discounts-calculation.service';
import { UserPayload } from 'src/auth/interfaces/jwt.payload';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private discountsCalcService: DiscountsCalculationService,
  ) {}

  private async processProductPrice(product: any, user?: UserPayload) {
      if (user && user.role === Role.RESELLER) {
          const fullUser = await this.prisma.user.findUnique({ where: { id: user.id }});
          
          if (!fullUser) {
              return { 
                  ...product, 
                  priceInfo: { originalPrice: product.price, discountPercentage: 0, finalPrice: product.price, appliedRule: 'NONE' } 
              };
          }

          const priceInfo = await this.discountsCalcService.calculatePrice(fullUser, product);
          
          return { ...product, price: priceInfo.finalPrice, priceInfo };
      }
      
      return { 
          ...product, 
          priceInfo: { 
              originalPrice: product.price, 
              discountPercentage: 0, 
              finalPrice: product.price, 
              appliedRule: 'NONE' 
          } 
      };
  }

  async search(term: string) {
    if (!term || term.trim() === '') {
      return [];
    }
    return this.prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { sku: { contains: term, mode: 'insensitive' } },
        ],
      },
      take: 10,
      include: {
        images: true,
        category: { select: { name: true } },
        brand: { select: { name: true } },
      },
    });
  }

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const { categoryId, brandId, images, ...productData } = createProductDto;
    const skuPrefix = productData.name.substring(0, 3).toUpperCase();
    const uniqueTimestamp = Date.now().toString().slice(-6);
    const generatedSku = `${skuPrefix}-${uniqueTimestamp}`;
    const data: Prisma.ProductCreateInput = {
      ...productData,
      sku: generatedSku,
      category: { connect: { id: categoryId } },
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
  
  async findAll(queryDto: QueryProductDto, user?: UserPayload) {
    const {
      page = 1,
      limit = 10,
      categoryId,
      brandId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
    } = queryDto;

    const skip = (Number(page) - 1) * Number(limit);

    const where: Prisma.ProductWhereInput = {};
    if (categoryId) where.categoryId = categoryId;
    if (brandId) where.brandId = brandId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          category: true,
          brand: true,
          images: true,
        },
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.product.count({ where }),
    ]);

    const processedProducts = await Promise.all(
      products.map(p => this.processProductPrice(p, user))
    );

    return {
      data: processedProducts,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        lastPage: Math.ceil(total / Number(limit)),
      },
    };
  }

  async findOne(id: string, user?: UserPayload): Promise<any> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        brand: true,
        images: true,
      },
    });
    if (!product) {
      throw new NotFoundException(`Produk dengan ID ${id} tidak ditemukan`);
    }
    return this.processProductPrice(product, user);
  }

  // 👇 **START OF CHANGES** 👇
  async findRelated(productId: string, type: 'brand' | 'category', user?: UserPayload) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Produk dengan ID ${productId} tidak ditemukan`);
    }

    let where: Prisma.ProductWhereInput = {
      id: { not: productId },
    };

    if (type === 'brand' && product.brandId) {
      where.brandId = product.brandId;
    } else if (type === 'category' && product.categoryId) {
      where.categoryId = product.categoryId;
    } else {
      return [];
    }

    const relatedProducts = await this.prisma.product.findMany({
      where,
      take: 8,
      include: {
        images: true,
        category: true,
        brand: true,
      },
    });
    
    // Process each related product to include priceInfo
    return Promise.all(relatedProducts.map(p => this.processProductPrice(p, user)));
  }
  // 👆 **END OF CHANGES** 👆

  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
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
          data: { images: { create: images } },
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
    const product = await this.prisma.product.findUnique({ where: { id } });
     if (!product) {
      throw new NotFoundException(`Produk dengan ID ${id} tidak ditemukan`);
    }
    return this.prisma.product.delete({
      where: { id },
    });
  }
}