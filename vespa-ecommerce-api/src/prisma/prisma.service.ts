// src/prisma/prisma.service.ts

import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    // Fungsi ini akan dipanggil saat modul pertama kali di-load
    // Kita gunakan untuk membuat koneksi ke database
    await this.$connect();
  }
}