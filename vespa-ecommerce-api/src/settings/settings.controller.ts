// file: vespa-ecommerce-api/src/settings/settings.controller.ts

import {
  Controller,
  Get,
  Param,
  Body,
  UseGuards,
  Put,
  Post,
  Patch,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { AuthGuard } from '@nestjs/passport'; // Menggunakan AuthGuard dari passport
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { UpdateMultipleSettingsDto } from './dto/update-multiple-settings.dto';
// Impor DTO yang benar dari file terpisah untuk validasi
import { UpdateVatDto } from './dto/update-vat.dto';

@Controller('settings')
@UseGuards(AuthGuard('jwt'), RolesGuard) // Melindungi semua endpoint di controller ini
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // ======================================================
  // ENDPOINT BARU KHUSUS UNTUK PPN
  // ======================================================

  /**
   * Mengambil pengaturan PPN saat ini.
   * Endpoint ini bisa diakses oleh pengguna yang sudah login (tidak harus admin)
   * untuk menampilkan detail PPN di frontend (misalnya halaman checkout).
   */
  @Get('ppn')
  async getVat() {
    const value = await this.settingsService.getVatPercentage();
    return { key: 'PPN', value };
  }

  /**
   * Memperbarui pengaturan PPN.
   * Hanya bisa diakses oleh ADMIN.
   */
  @Patch('ppn') // Menggunakan @Patch karena ini update field spesifik
  @Roles(Role.ADMIN)
  async updateVat(@Body() updateVatDto: UpdateVatDto) {
    return this.settingsService.updateVatPercentage(updateVatDto.value);
  }

  // ======================================================
  // ENDPOINT UMUM UNTUK PENGATURAN
  // ======================================================

  /**
   * Mengambil semua pengaturan. Hanya untuk ADMIN.
   */
  @Get()
  @Roles(Role.ADMIN)
  getAllSettings() {
    return this.settingsService.getAllSettings();
  }

  /**
   * Mengambil satu pengaturan berdasarkan key. Hanya untuk ADMIN.
   */
  @Get(':key')
  @Roles(Role.ADMIN)
  getSetting(@Param('key') key: string) {
    return this.settingsService.getSetting(key);
  }

  /**
   * Memperbarui satu pengaturan berdasarkan key. Hanya untuk ADMIN.
   */
  @Put(':key')
  @Roles(Role.ADMIN)
  updateSetting(
    @Param('key') key: string,
    @Body() updateSettingDto: UpdateSettingDto,
  ) {
    return this.settingsService.updateSetting(key, updateSettingDto);
  }

  /**
   * Memperbarui beberapa pengaturan sekaligus. Hanya untuk ADMIN.
   */
  @Post('batch-update')
  @Roles(Role.ADMIN)
  updateMultipleSettings(@Body() dto: UpdateMultipleSettingsDto) {
    return this.settingsService.updateMultipleSettings(dto);
  }
}