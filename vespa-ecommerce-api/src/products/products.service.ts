// file: src/products/products.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { Product, Prisma, Role } from '@prisma/client';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { DiscountsCalculationService } from 'src/discounts/discounts-calculation.service';
import { UserPayload } from 'src/auth/interfaces/jwt.payload';
import { PriceCalculatorService } from './price-calculator.service';
import { BulkUpdateVisibilityDto } from './dto/bulk-update-visibility.dto';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private discountsCalcService: DiscountsCalculationService,
    private priceCalculator: PriceCalculatorService,
    private configService: ConfigService,
  ) { }

  // Process product with pricing logic (General logic)
  public async processProductWithPrice(product: any, user?: UserPayload) {
    let accuratePriceCategoryId: number | null = null;

    if (user?.id) {
      // A. IF USER IS LOGGED IN: Get price category from user database
      const fullUser = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { accuratePriceCategoryId: true, role: true, id: true },
      });
      accuratePriceCategoryId = fullUser?.accuratePriceCategoryId || null;

      // LEGACY FALLBACK: If no Accurate category but is RESELLER
      if (!accuratePriceCategoryId && fullUser?.role === Role.RESELLER) {
        const priceInfo = await this.discountsCalcService.calculatePrice(
          fullUser as any,
          product,
        );
        return {
          ...product,
          price: priceInfo.finalPrice,
          priceInfo: {
            originalPrice: product.price,
            discountPercentage: 0,
            finalPrice: priceInfo.finalPrice,
            appliedRule: priceInfo.appliedRule,
          },
        };
      }
    } else {
      // B. IF NOT LOGGED IN (GUEST): Use "General" category from ENV
      const defaultCatId = this.configService.get<string>('ACCURATE_DEFAULT_PRICE_CATEGORY_ID');
      if (defaultCatId) {
        accuratePriceCategoryId = Number(defaultCatId);
      }
    }

    // 2. Call Calculator Service to calculate price (Tiers & Rules)
    const finalPrice = this.priceCalculator.calculateFinalPrice(
      product,
      accuratePriceCategoryId,
    );

    // 3. Return product data with final price
    return {
      ...product,
      price: finalPrice,
      priceInfo: {
        originalPrice: product.price,
        finalPrice: finalPrice,
      },
    };
  }

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const { categoryId, brandId, images, sku, isVisible, ...productData } =
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
      isVisible: isVisible,
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
        // Include empty relations rules on create
        priceTiers: true,
        priceAdjustmentRules: true,
      },
    });
  }

  async findAll(
    queryDto: QueryProductDto,
    user?: UserPayload,
  ) {
    const {
      page = 1,
      limit = 10,
      categoryId,
      brandId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      includeHidden, // string | undefined
      isVisible,     // string | undefined
    } = queryDto;

    const skip = (Number(page) - 1) * Number(limit);

    const conditions: Prisma.ProductWhereInput[] = [];

    const isAdmin = user?.role === Role.ADMIN;

    // Handle string/boolean overlap for 'isVisible' safely
    let finalIsVisible: boolean | undefined = undefined;
    if ((isVisible as any) === true || isVisible === 'true') {
      finalIsVisible = true;
    } else if ((isVisible as any) === false || isVisible === 'false') {
      finalIsVisible = false;
    }

    // Handle includeHidden (also commonly string from DTO)
    const includeHiddenBool = (includeHidden as any) === true || includeHidden === 'true';

    if (finalIsVisible !== undefined) {
      // If user specifically sends filter ?isVisible=true or ?isVisible=false
      conditions.push({ isVisible: finalIsVisible });
    } else {
      // Default behavior if filter is NOT sent:
      // - Regular user -> Only show active (isVisible: true)
      // - Admin WITHOUT includeHidden=true -> Only show active
      // - (Admin WITH includeHidden=true will skip this block and show all)
      if (!isAdmin || !includeHiddenBool) {
        conditions.push({ isVisible: true });
      }
    }

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
      const regularCategoryIds = categoryId.filter((id) => id !== '__null__');

      const categoryConditions: Prisma.ProductWhereInput[] = [];

      if (regularCategoryIds.length > 0) {
        categoryConditions.push({ categoryId: { in: regularCategoryIds } });
      }
      if (hasNullCategory) {
        categoryConditions.push({ categoryId: null });
      }

      if (categoryConditions.length > 0) {
        conditions.push({ OR: categoryConditions });
      }
    }

    if (brandId && brandId.length > 0) {
      conditions.push({ brandId: { in: brandId } });
    }

    const where: Prisma.ProductWhereInput =
      conditions.length > 0 ? { AND: conditions } : {};

    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          category: true,
          brand: true,
          images: true,
          priceTiers: true,
          priceAdjustmentRules: { where: { isActive: true } },
        },
        orderBy: [
          { isFeatured: 'desc' },
          { [sortBy]: sortOrder },
        ],
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

  async findFeatured(user?: UserPayload) {
    const featuredProducts = await this.prisma.product.findMany({
      where: { isFeatured: true, isVisible: true },
      take: 5,
      include: {
        images: true,
        category: true,
        brand: true,
        priceTiers: true,
        priceAdjustmentRules: { where: { isActive: true } },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

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
        priceTiers: true,
        priceAdjustmentRules: { where: { isActive: true } },
      },
    });
    if (!product) {
      throw new NotFoundException(`Produk dengan ID ${id} tidak ditemukan`);
    }

    if (!product.isVisible && user?.role !== Role.ADMIN) {
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
      throw new NotFoundException(
        `Produk dengan ID ${productId} tidak ditemukan`,
      );
    }

    let where: Prisma.ProductWhereInput = {
      id: { not: productId },
      isVisible: true,
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
        priceTiers: true,
        priceAdjustmentRules: { where: { isActive: true } },
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
    const {
      categoryId,
      brandId,
      images,
      isFeatured,
      isVisible,
      ...productData
    } = updateProductDto;

    if (isFeatured === true) {
      const featuredCount = await this.prisma.product.count({
        where: { isFeatured: true, NOT: { id } },
      });
      if (featuredCount >= 5) {
        throw new BadRequestException(
          'Maksimal 5 produk yang bisa diunggulkan.',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const dataToUpdate: any = {
        ...productData,
        ...(isFeatured !== undefined && { isFeatured }),
        ...(isVisible !== undefined && { isVisible }),
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
          priceTiers: true,
          priceAdjustmentRules: true,
        },
      });
    });
  }

  async remove(id: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        orderItems: { take: 1 },
        wishlists: { take: 1 },
        reviews: { take: 1 },
      },
    });

    if (!product) {
      throw new NotFoundException(`Produk dengan ID ${id} tidak ditemukan`);
    }

    if (product.orderItems.length > 0) {
      throw new BadRequestException(
        `Produk "${product.name}" tidak dapat dihapus karena sudah menjadi bagian dari pesanan.`,
      );
    }

    if (product.wishlists.length > 0) {
      throw new BadRequestException(
        `Produk "${product.name}" tidak dapat dihapus karena masih ada di wishlist pengguna.`,
      );
    }

    if (product.reviews.length > 0) {
      throw new BadRequestException(
        `Produk "${product.name}" tidak dapat dihapus karena sudah memiliki ulasan.`,
      );
    }

    return this.prisma.product.delete({
      where: { id },
    });
  }

  async bulkUpdateVisibility(
    bulkUpdateVisibilityDto: BulkUpdateVisibilityDto,
  ) {
    const { productIds, isVisible } = bulkUpdateVisibilityDto;

    const result = await this.prisma.product.updateMany({
      where: {
        id: {
          in: productIds,
        },
      },
      data: {
        isVisible: isVisible,
      },
    });

    return {
      message: `Successfully updated visibility for ${result.count} products.`,
      count: result.count,
    };
  }

  async search(term: string) {
    if (!term || term.trim() === '') {
      return [];
    }
    return this.prisma.product.findMany({
      where: {
        isVisible: true,
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