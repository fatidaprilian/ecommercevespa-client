// file: src/products/products.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
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

  public async processProductWithPrice(product: any, user?: UserPayload) {
    if (user && user.role === Role.RESELLER) {
      const fullUser = await this.prisma.user.findUnique({
        where: { id: user.id },
      });
      if (!fullUser) {
        return {
          ...product,
          priceInfo: {
            originalPrice: product.price,
            discountPercentage: 0,
            finalPrice: product.price,
            appliedRule: 'NONE',
          },
        };
      }
      const priceInfo = await this.discountsCalcService.calculatePrice(
        fullUser,
        product,
      );
      return { ...product, price: priceInfo.finalPrice, priceInfo };
    }
    return {
      ...product,
      priceInfo: {
        originalPrice: product.price,
        discountPercentage: 0,
        finalPrice: product.price,
        appliedRule: 'NONE',
      },
    };
  }

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const { categoryId, brandId, images, sku, ...productData } =
      createProductDto;

    let finalSku = sku;
    if (!finalSku) {
      const namePrefix = productData.name.substring(0, 3).toUpperCase();
      const timestamp = Date.now().toString().slice(-6);
      finalSku = `${namePrefix}-${timestamp}`;
    }

    const data: Prisma.ProductCreateInput = {
      ...productData,
      sku: finalSku,
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

    const conditions: Prisma.ProductWhereInput[] = [];

    if (search) {
      conditions.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    
    if (categoryId && categoryId.length > 0) {
      const hasNullCategory = categoryId.includes('__null__');
      const regularCategoryIds = categoryId.filter(id => id !== '__null__');
      
      const categoryConditions: Prisma.ProductWhereInput[] = [];

      if(regularCategoryIds.length > 0) {
        categoryConditions.push({ categoryId: { in: regularCategoryIds } });
      }
      if(hasNullCategory) {
        categoryConditions.push({ categoryId: null });
      }

      if(categoryConditions.length > 0) {
          conditions.push({ OR: categoryConditions });
      }
    }

    if (brandId && brandId.length > 0) {
        conditions.push({ brandId: { in: brandId } });
    }

    const where: Prisma.ProductWhereInput = conditions.length > 0 ? { AND: conditions } : {};

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
      products.map((p) => this.processProductWithPrice(p, user)),
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
  
  // =======================================================
  // DIUBAH: Method sekarang menerima informasi user
  // =======================================================
  async findFeatured(user?: UserPayload) {
    const featuredProducts = await this.prisma.product.findMany({
      where: { isFeatured: true },
      take: 5,
      include: {
        images: true,
        category: true,
        brand: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
    
    // Teruskan user ke fungsi kalkulasi harga
    return Promise.all(
      featuredProducts.map((p) => this.processProductWithPrice(p, user)),
    );
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
    return this.processProductWithPrice(product, user);
  }

  async findRelated(
    productId: string,
    type: 'brand' | 'category',
    user?: UserPayload,
  ) {
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

    return Promise.all(
      relatedProducts.map((p) => this.processProductWithPrice(p, user)),
    );
  }
  
  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const { categoryId, brandId, images, isFeatured, ...productData } = updateProductDto;

    if (isFeatured === true) {
      const featuredCount = await this.prisma.product.count({
        where: { isFeatured: true, NOT: { id } },
      });
      if (featuredCount >= 5) {
        throw new BadRequestException('Maksimal 5 produk yang bisa diunggulkan.');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const dataToUpdate: any = { 
        ...productData,
        ...(isFeatured !== undefined && { isFeatured }),
      };

      if (categoryId) {
        dataToUpdate.category = { connect: { id: categoryId } };
      }
      if (brandId) {
        dataToUpdate.brand = { connect: { id: brandId } };
      }

      await tx.product.update({
        where: { id },
        data: dataToUpdate,
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
}