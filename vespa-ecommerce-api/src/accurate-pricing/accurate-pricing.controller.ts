// src/accurate-pricing/accurate-pricing.controller.ts

import { Controller, Get, Delete, HttpCode, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { AccuratePricingService } from './accurate-pricing.service';

@Controller('accurate-pricing')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AccuratePricingController {
  constructor(private readonly accuratePricingService: AccuratePricingService) {}

  /**
   * Ambil daftar kategori harga (cached 24h)
   */
  @Get('categories')
  @Roles(Role.ADMIN) // Hanya Admin yang boleh akses
  async getPriceCategories() {
    return this.accuratePricingService.getPriceCategories();
  }

  /**
   * Manual clear cache kategori
   */
  @Delete('categories/cache')
  @Roles(Role.ADMIN) // Hanya Admin yang boleh akses
  @HttpCode(200)
  async clearCategoriesCache() {
    await this.accuratePricingService.clearPriceCategoriesCache();
    return { message: 'Cache kategori berhasil dihapus. Request berikutnya akan fetch dari Accurate.' };
  }

  /**
   * Sync kategori customer dari Accurate (manual trigger)
   */
  @Get('sync-customer-category/:customerNo')
  @Roles(Role.ADMIN) // Hanya Admin yang boleh akses
  async syncCustomerCategory(@Param('customerNo') customerNo: string) {
    const result = await this.accuratePricingService.getCustomerCategoryFromAccurate(customerNo);
    
    if (result.categoryId) {
      return {
        success: true,
        message: `Kategori customer berhasil diambil dari Accurate: ${result.categoryName}`,
        categoryId: result.categoryId,
        categoryName: result.categoryName,
      };
    }

    return {
      success: false,
      message: 'Customer tidak punya kategori di Accurate atau tidak ditemukan',
      categoryId: null,
      categoryName: null,
    };
  }
}