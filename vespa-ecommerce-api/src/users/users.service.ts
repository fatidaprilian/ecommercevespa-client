// file: src/users/users.service.ts

import { Injectable, ConflictException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { Role, User } from '@prisma/client';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ConfigService } from '@nestjs/config';
import { AccuratePricingService } from 'src/accurate-pricing/accurate-pricing.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private accuratePricingService: AccuratePricingService,
  ) {}

  async findAll() {
    return this.prisma.user.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        accurateCustomerNo: true,
        accuratePriceCategoryId: true,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findAllInactive() {
    return this.prisma.user.findMany({
      where: {
        isActive: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        accurateCustomerNo: true,
        accuratePriceCategoryId: true,
        isActive: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const oldUser = await this.findById(id);

    let dataToUpdate: any = {
      ...updateUserDto,
      accurateCustomerNo: updateUserDto.accurateCustomerNo === '' ? null : updateUserDto.accurateCustomerNo,
    };

    // 1. Update database lokal
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        accurateCustomerNo: true,
        accuratePriceCategoryId: true,
        isActive: true,
      },
    });

    // 2. LOGIKA SINKRONISASI ACCURATE (DINAMIS)
    if (
      updatedUser.accurateCustomerNo &&
      (updateUserDto.role !== undefined || updateUserDto.accuratePriceCategoryId !== undefined)
    ) {
      let categoryIdToSync: number | null = null;

      // SKENARIO 1: Admin mengubah Role jadi MEMBER -> Paksa balik ke kategori 'Umum'
      if (updatedUser.role === Role.MEMBER) {
        categoryIdToSync = Number(this.configService.get('ACCURATE_DEFAULT_PRICE_CATEGORY_ID'));

        // Reset field di database lokal juga biar konsisten
        if (updatedUser.accuratePriceCategoryId !== categoryIdToSync) {
          await this.prisma.user.update({
            where: { id },
            data: { accuratePriceCategoryId: categoryIdToSync },
          });
        }
      }
      // SKENARIO 2: Admin pilih Role RESELLER
      else if (updatedUser.role === Role.RESELLER) {
        // Prioritas 1: Admin manual pilih kategori (field dikirim dari form)
        if (updateUserDto.accuratePriceCategoryId !== undefined) {
          categoryIdToSync = updateUserDto.accuratePriceCategoryId;
        }
        // Prioritas 2: Fallback ke kategori default reseller dari .env
        else if (!updatedUser.accuratePriceCategoryId) {
          const resellerCategoryId = this.configService.get('ACCURATE_RESELLER_CATEGORY_ID');
          if (resellerCategoryId) {
            categoryIdToSync = Number(resellerCategoryId);
            
            // FIX: Simpan juga ke database lokal!
            await this.prisma.user.update({
              where: { id },
              data: { accuratePriceCategoryId: categoryIdToSync },
            });
          }
        }
        // Prioritas 3: Pakai kategori existing di database (kalau ada)
        else {
          categoryIdToSync = updatedUser.accuratePriceCategoryId;
        }
      }

      // EKSEKUSI SYNC
      if (categoryIdToSync) {
        this.logger.log(`Syncing user ${id} to Accurate price category ${categoryIdToSync}...`);
        await this.accuratePricingService
          .updateCustomerCategory(updatedUser.accurateCustomerNo, categoryIdToSync)
          .catch((err) => this.logger.error(`Background sync failed for user ${id}:`, err));
      }
    }

    return updatedUser;
  }

  async updateRole(userId: string, newRole: Role) {
    await this.findById(userId);
    return this.prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        isActive: true,
      },
    });
  }

  async remove(userId: string): Promise<Pick<User, 'id' | 'isActive'>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User dengan ID ${userId} tidak ditemukan.`);
    }

    if (!user.isActive) {
      throw new ConflictException(`User dengan ID ${userId} sudah tidak aktif.`);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
      select: { id: true, isActive: true },
    });
    return updatedUser;
  }

  async create(createUserDto: CreateUserDto) {
    const { email, password, name, role } = createUserDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      if (!existingUser.isActive) {
        throw new ConflictException('Email ini sudah terdaftar tetapi akun tidak aktif.');
      } else {
        throw new ConflictException('User dengan email ini sudah terdaftar');
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: { email, password: hashedPassword, name, role },
    });

    const { password: _, ...result } = user;
    return result;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: {
        email: email,
        isActive: true,
      },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User dengan ID ${id} tidak ditemukan.`);
    }
    const { password, ...result } = user;
    return result;
  }

  async updateProfile(userId: string, data: UpdateProfileDto) {
    const user = await this.findById(userId);
    if (!user.isActive) {
      throw new ForbiddenException('Akun Anda tidak aktif.');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { name: data.name },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        isActive: true,
      },
    });
  }

  async toggleIsActive(userId: string): Promise<Partial<User>> {
    const user = await this.findById(userId);
    const newStatus = !user.isActive;

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: newStatus },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        accurateCustomerNo: true,
        isActive: true,
        emailVerified: true,
      },
    });
    return updatedUser;
  }

  async syncAllResellerCategories() {
    const users = await this.prisma.user.findMany({
      where: {
        accurateCustomerNo: { not: null },
        accuratePriceCategoryId: null,
      },
      select: {
        id: true,
        accurateCustomerNo: true,
        accuratePriceCategoryId: true,
      },
    });

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const user of users) {
      if (!user.accuratePriceCategoryId && user.accurateCustomerNo) {
        try {
          const result = await this.accuratePricingService.getCustomerCategoryFromAccurate(
            user.accurateCustomerNo,
          );

          if (result.categoryId) {
            await this.prisma.user.update({
              where: { id: user.id },
              data: { accuratePriceCategoryId: result.categoryId },
            });
            successCount++;
            this.logger.log(`Synced category for user ${user.id} -> ${result.categoryName}`);
          } else {
            failedCount++;
          }
        } catch (error) {
          failedCount++;
          errors.push(`Gagal sync user ${user.id}: ${error.message}`);
          this.logger.error(`Error syncing user ${user.id}: ${error.message}`);
        }
        // Jeda kecil agar tidak kena rate limit Accurate
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    return {
      success: true,
      message: `Bulk sync selesai. Sukses diperbarui: ${successCount}, Gagal/Skip: ${failedCount}`,
      details: {
        successCount,
        failedCount,
        errors,
      },
    };
  }
}