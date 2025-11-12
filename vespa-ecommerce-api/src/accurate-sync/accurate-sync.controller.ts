import { Controller, Post, Get, UseGuards } from '@nestjs/common';
import { AccurateSyncService } from './accurate-sync.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '@prisma/client';

/**
 * Prefix '/api/v1' akan ditambahkan secara otomatis dari main.ts
 */
@Controller('accurate-sync')
export class AccurateSyncController {
    constructor(private readonly accurateSyncService: AccurateSyncService) {}

    /**
     * Endpoint untuk memicu sinkronisasi produk dari Accurate.
     * Hanya bisa diakses oleh ADMIN.
     */
    @Post('products')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(Role.ADMIN)
    async triggerProductSync() {
        return this.accurateSyncService.syncProductsFromAccurate();
    }

    // 👇👇 TAMBAHAN BARU UNTUK TESTING 👇👇
    @Post('sync-rules')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(Role.ADMIN)
    async syncPriceRules() {
        return this.accurateSyncService.syncPriceAdjustmentRules();
    }
    // 👆👆 ----------------------------- 👆👆
}