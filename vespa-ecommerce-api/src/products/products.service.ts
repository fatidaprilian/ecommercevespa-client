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
// Import Service Kalkulator Baru
import { PriceCalculatorService } from './price-calculator.service';
// <-- IMPORT DTO BARU UNTUK BULK UPDATE
import { BulkUpdateVisibilityDto } from './dto/bulk-update-visibility.dto';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private discountsCalcService: DiscountsCalculationService,
    // private readonly accuratePricingService: AccuratePricingService, // Opsional, bisa dihapus jika tidak ada logic lain yg butuh
    private priceCalculator: PriceCalculatorService, // <-- INJECT SERVICE BARU
  ) {}

  // 👇👇👇 METHOD YANG SUDAH DI-REVISI TOTAL MENGGUNAKAN CALCULATOR SERVICE 👇👇👇
  public async processProductWithPrice(product: any, user?: UserPayload) {
    // 1. Cek apakah user login dan punya kategori harga Accurate
    let accuratePriceCategoryId: number | null = null;
    if (user?.id) {
      // Tips Optimasi: Jika ID Kategori Harga sudah ada di payload JWT,
      // kita bisa pakai langsung tanpa query ke DB lagi.
      // Untuk sekarang kita query dulu biar aman.
      const fullUser = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { accuratePriceCategoryId: true, role: true, id: true },
      });
      accuratePriceCategoryId = fullUser?.accuratePriceCategoryId || null;

      // FALLBACK LAMA: Jika tidak ada kategori Accurate, tapi dia Reseller,
      // gunakan logic diskon lama (opsional, bisa dihapus jika ingin full Accurate)
      if (!accuratePriceCategoryId && fullUser?.role === Role.RESELLER) {
        const priceInfo = await this.discountsCalcService.calculatePrice(
          fullUser as any, // Casting sementara karena kita cuma select sebagian field
          product,
        );
        return {
          ...product,
          price: priceInfo.finalPrice,
          priceInfo: {
            originalPrice: product.price,
            discountPercentage: 0, // Disederhanakan sesuai request klien
            finalPrice: priceInfo.finalPrice,
            appliedRule: priceInfo.appliedRule,
          },
        };
      }
    }

    // 2. Panggil Calculator Service untuk hitung harga
    const finalPrice = this.priceCalculator.calculateFinalPrice(
      product,
      accuratePriceCategoryId,
    );

    // 3. Kembalikan data produk dengan harga final yang sudah dihitung
    return {
      ...product,
      price: finalPrice, // <-- HARGA FINAL LANGSUNG DI SINI
      // Opsi tambahan jika frontend butuh detail (tapi klien minta simple)
      priceInfo: {
        originalPrice: product.price,
        finalPrice: finalPrice,
        // appliedRule: 'CALCULATED_BY_TIER_AND_RULES',
      },
    };
  }
  // 👆👆👆 AKHIR REVISI 👆👆👆

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const { categoryId, brandId, images, sku, isVisible, ...productData } =
      // <-- Destructure isVisible
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
      isVisible: isVisible, // <-- Tambahkan isVisible di data create
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
        // Sertakan relasi rules kosong saat create
        priceTiers: true,
        priceAdjustmentRules: true,
      },
    });
  }

  // ✅✅✅ HANYA BAGIAN INI YANG DIUBAH (FIX TS ERROR) ✅✅✅
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

    // 🔥🔥🔥 REVISI ULTRA-SAFE & TS-FRIENDLY 🔥🔥🔥
    // Kita gunakan (isVisible as any) untuk membungkam error TS2367
    // karena kita menangani kemungkinan runtime value berupa boolean ATAU string.
    let finalIsVisible: boolean | undefined = undefined;
    if ((isVisible as any) === true || isVisible === 'true') {
      finalIsVisible = true;
    } else if ((isVisible as any) === false || isVisible === 'false') {
      finalIsVisible = false;
    }

    // Handle includeHidden juga jika perlu (sama-sama string dari DTO baru)
    const includeHiddenBool = (includeHidden as any) === true || includeHidden === 'true';

    if (finalIsVisible !== undefined) {
      // Jika user mengirim filter ?isVisible=true atau ?isVisible=false
      conditions.push({ isVisible: finalIsVisible });
    } else {
      // Default behavior jika filter TIDAK dikirim:
      // - User biasa -> Hanya tampilkan yang aktif (isVisible: true)
      // - Admin TANPA includeHidden=true -> Hanya tampilkan yang aktif
      // - (Admin DENGAN includeHidden=true akan melewati blok ini dan menampilkan semua)
      if (!isAdmin || !includeHiddenBool) {
        conditions.push({ isVisible: true });
      }
    }
    // ✅✅✅ AKHIR PERUBAHAN ULTRA-SAFE ✅✅✅

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

  // +++ METHOD BARU UNTUK BULK UPDATE +++
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
  // +++ AKHIR METHOD BARU +++

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