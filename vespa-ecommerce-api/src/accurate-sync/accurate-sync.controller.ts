// file: vespa-ecommerce-api/src/accurate-sync/accurate-sync.controller.ts

import { Controller, Post, UseGuards } from '@nestjs/common';
import { AccurateSyncService } from './accurate-sync.service';
import { AuthGuard } from '@nestjs/passport'; // Asumsi Anda punya AuthGuard
import { Roles } from '../auth/decorators/roles.decorator'; // Asumsi Anda punya decorator Roles
import { Role } from '@prisma/client';

@Controller('accurate-sync')
export class AccurateSyncController {
    constructor(private readonly accurateSyncService: AccurateSyncService) {}

    /**
     * Endpoint untuk memicu sinkronisasi produk dari Accurate.
     * Hanya bisa diakses oleh ADMIN.
     */
    @Post('products')
    @UseGuards(AuthGuard('jwt')) // Amankan endpoint ini
    @Roles(Role.ADMIN)
    async triggerProductSync() {
        return this.accurateSyncService.syncProductsFromAccurate();
    }
}