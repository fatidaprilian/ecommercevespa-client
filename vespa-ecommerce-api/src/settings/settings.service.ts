// file: vespa-ecommerce-api/src/settings/settings.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { UpdateMultipleSettingsDto } from './dto/update-multiple-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Mengambil semua pengaturan yang ada.
   */
  async getAllSettings() {
    return this.prisma.appSettings.findMany();
  }

  /**
   * Mengambil satu pengaturan berdasarkan kuncinya (key).
   * @param key - Kunci unik dari pengaturan.
   */
  async getSetting(key: string) {
    const setting = await this.prisma.appSettings.findUnique({ where: { key } });
    if (!setting) {
      throw new NotFoundException(`Pengaturan dengan kunci "${key}" tidak ditemukan.`);
    }
    return setting;
  }

  /**
   * Membuat atau memperbarui (upsert) sebuah pengaturan.
   * @param key - Kunci unik dari pengaturan.
   * @param updateSettingDto - Data pengaturan yang akan disimpan.
   */
  async updateSetting(key: string, updateSettingDto: UpdateSettingDto) {
    return this.prisma.appSettings.upsert({
      where: { key },
      update: { value: updateSettingDto.value },
      create: { key, value: updateSettingDto.value, description: updateSettingDto.description },
    });
  }

  /**
   * Membuat atau memperbarui beberapa pengaturan sekaligus dalam satu transaksi.
   * @param dto - Objek yang berisi array pengaturan.
   */
  async updateMultipleSettings(dto: UpdateMultipleSettingsDto) {
    const transactions = dto.settings.map(setting =>
      this.prisma.appSettings.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: { key: setting.key, value: setting.value },
      }),
    );
    // Menjalankan semua operasi update dalam satu transaksi database
    return this.prisma.$transaction(transactions);
  }

  // ======================================================
  // METODE BARU UNTUK PENGATURAN PPN (VAT)
  // ======================================================

  /**
   * Mengambil nilai PPN (Pajak Pertambahan Nilai) saat ini dari database.
   * Jika pengaturan PPN tidak ditemukan, akan mengembalikan nilai default (11%).
   * @returns {Promise<number>} Persentase PPN dalam bentuk angka.
   */
  async getVatPercentage(): Promise<number> {
    const vatSetting = await this.prisma.appSettings.findUnique({
      where: { key: 'PPN' },
    });

    // Jika PPN belum di-set di database, kembalikan nilai default yang aman.
    if (!vatSetting || !vatSetting.value) {
      return 11;
    }
    
    // Konversi nilai dari string ke angka sebelum dikembalikan.
    return parseFloat(vatSetting.value);
  }

  /**
   * Membuat atau memperbarui pengaturan PPN.
   * Metode ini adalah shortcut khusus untuk mengelola nilai PPN.
   * @param {number} value - Persentase PPN baru yang akan disimpan.
   */
  async updateVatPercentage(value: number) {
    const key = 'PPN';
    return this.prisma.appSettings.upsert({
      where: { key },
      update: { value: value.toString() },
      create: {
        key,
        value: value.toString(),
        description: 'Persentase Pajak Pertambahan Nilai (PPN) dalam persen.',
      },
    });
  }
}