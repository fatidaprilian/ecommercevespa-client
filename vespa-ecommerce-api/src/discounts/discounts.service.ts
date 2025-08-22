// file: src/discounts/discounts.service.ts

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Role } from '@prisma/client';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { AddDiscountRuleDto } from './dto/add-discount-rule.dto';

@Injectable()
export class DiscountsService {
  constructor(private prisma: PrismaService) {}

  async findDiscountsByUserId(userId: string, paginationDto: PaginationDto) {
    const page = Number(paginationDto.page) || 1;
    const limit = Number(paginationDto.limit) || 5;
    const skip = (page - 1) * limit;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`User dengan ID ${userId} tidak ditemukan.`);
    }

    const [categoryDiscounts, totalCategoryDiscounts] = await this.prisma.$transaction([
      this.prisma.userCategoryDiscount.findMany({
        where: { userId },
        skip,
        take: limit,
        include: { category: { select: { name: true } } },
        orderBy: { category: { name: 'asc' } },
      }),
      this.prisma.userCategoryDiscount.count({ where: { userId } }),
    ]);

    const [productDiscounts, totalProductDiscounts] = await this.prisma.$transaction([
        this.prisma.userProductDiscount.findMany({
            where: { userId },
            skip,
            take: limit,
            include: { product: { select: { name: true, sku: true } } },
            orderBy: { product: { name: 'asc' } },
        }),
        this.prisma.userProductDiscount.count({ where: { userId } }),
    ]);

    return {
      defaultDiscountPercentage: user.defaultDiscountPercentage,
      categoryDiscounts: {
        data: categoryDiscounts,
        meta: { 
            total: totalCategoryDiscounts, 
            page, 
            limit, 
            lastPage: Math.ceil(totalCategoryDiscounts / limit) || 1
        },
      },
      productDiscounts: {
        data: productDiscounts,
        meta: { 
            total: totalProductDiscounts, 
            page, 
            limit, 
            lastPage: Math.ceil(totalProductDiscounts / limit) || 1
        },
      },
    };
  }
  
  async updateDefaultDiscount(userId: string, discount: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { defaultDiscountPercentage: discount },
    });
    return { message: 'Diskon dasar berhasil diperbarui.' };
  }

  async addDiscountRule(userId: string, dto: AddDiscountRuleDto) {
    if (dto.type === 'category') {
        return this.prisma.userCategoryDiscount.create({
            data: {
                userId,
                categoryId: dto.ruleId,
                discountPercentage: dto.discountPercentage,
            },
        });
    }
    if (dto.type === 'product') {
        return this.prisma.userProductDiscount.create({
            data: {
                userId,
                productId: dto.ruleId,
                discountPercentage: dto.discountPercentage,
            },
        });
    }
    throw new BadRequestException('Tipe diskon tidak valid.');
  }

  async removeDiscountRule(ruleId: string) {
    try {
        await this.prisma.userCategoryDiscount.delete({ where: { id: ruleId }});
    } catch (e) {
        try {
            await this.prisma.userProductDiscount.delete({ where: { id: ruleId }});
        } catch (finalError) {
            throw new NotFoundException(`Aturan diskon dengan ID ${ruleId} tidak ditemukan.`);
        }
    }
  }
}