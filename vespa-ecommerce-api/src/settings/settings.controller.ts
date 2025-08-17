// file: vespa-ecommerce-api/src/settings/settings.controller.ts

import { Controller, Get, Param, Body, UseGuards, Put, Post } from '@nestjs/common'; // <-- 1. TAMBAHKAN Post
import { SettingsService } from './settings.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { UpdateMultipleSettingsDto } from './dto/update-multiple-settings.dto'; // <-- 2. IMPORT DTO BARU

@Controller('settings')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // ... (endpoint GET dan PUT yang lama tetap sama) ...
  @Get()
  @Roles(Role.ADMIN)
  getAllSettings() {
    return this.settingsService.getAllSettings();
  }

  @Get(':key')
  @Roles(Role.ADMIN)
  getSetting(@Param('key') key: string) {
    return this.settingsService.getSetting(key);
  }

  @Put(':key')
  @Roles(Role.ADMIN)
  updateSetting(
    @Param('key') key: string,
    @Body() updateSettingDto: UpdateSettingDto,
  ) {
    return this.settingsService.updateSetting(key, updateSettingDto);
  }
  
  // --- 3. TAMBAHKAN ENDPOINT BARU DI SINI ---
  @Post('batch-update')
  @Roles(Role.ADMIN)
  updateMultipleSettings(@Body() dto: UpdateMultipleSettingsDto) {
    return this.settingsService.updateMultipleSettings(dto);
  }
}