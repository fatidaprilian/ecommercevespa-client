// file: src/users/users.controller.ts

import { 
  Controller, 
  Get, 
  UseGuards, 
  Req, 
  ClassSerializerInterceptor, 
  UseInterceptors, 
  Patch, 
  Param, 
  Body, 
  Delete, 
  HttpCode, 
  HttpStatus, 
  Query,
  BadRequestException,
  NotFoundException 
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { AuthenticatedRequest } from 'src/auth/interfaces/authenticated-request.interface';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AccuratePricingService } from '../accurate-pricing/accurate-pricing.service';

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly accuratePricingService: AccuratePricingService,
  ) {}

  // Endpoint untuk profil user yang sedang login (Member, Reseller, Admin)
  @Get('profile')
  @Roles(Role.MEMBER, Role.RESELLER, Role.ADMIN)
  async getProfile(@Req() req: AuthenticatedRequest) {
    return this.usersService.findById(req.user.id);
  }

  // Endpoint untuk update profil user yang sedang login
  @Patch('profile')
  @Roles(Role.MEMBER, Role.RESELLER, Role.ADMIN)
  updateProfile(@Req() req: AuthenticatedRequest, @Body() updateProfileDto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, updateProfileDto);
  }

  // --- Endpoint Khusus Admin ---

  // --- Endpoint untuk user Aktif (default) ---
  @Get()
  @Roles(Role.ADMIN)
  findAllActive() {
    return this.usersService.findAll();
  }

  // --- Endpoint untuk user Non-Aktif ---
  @Get('inactive')
  @Roles(Role.ADMIN)
  findAllInactive() {
    return this.usersService.findAllInactive();
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/role')
  @Roles(Role.ADMIN)
  updateRole(@Param('id') id: string, @Body() updateUserRoleDto: UpdateUserRoleDto) {
    return this.usersService.updateRole(id, updateUserRoleDto.role);
  }

  /**
   * Sync kategori customer dari Accurate (manual trigger dari list/index)
   * Endpoint: PATCH /users/:id/sync-category
   */
  @Patch(':id/sync-category')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async syncCategoryFromAccurate(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    
    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    if (!user.accurateCustomerNo) {
      throw new BadRequestException('User tidak punya Accurate Customer Number');
    }

    const result = await this.accuratePricingService.getCustomerCategoryFromAccurate(
      user.accurateCustomerNo
    );

    if (result.categoryId) {
      // Update database dengan kategori dari Accurate
      await this.usersService.update(id, { 
        accuratePriceCategoryId: result.categoryId 
      });

      return {
        success: true,
        message: `Kategori berhasil disinkronkan: ${result.categoryName}`,
        categoryId: result.categoryId,
        categoryName: result.categoryName,
      };
    }

    return {
      success: false,
      message: result.categoryName || 'Customer tidak punya kategori valid di Accurate',
      categoryId: null,
      categoryName: null,
    };
  }

  /**
   * Force reset customer category ke default (emergency fix untuk kategori invalid)
   * Endpoint: PATCH /users/:id/force-reset-category
   */
  @Patch(':id/force-reset-category')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async forceResetCategory(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    
    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    if (!user.accurateCustomerNo) {
      throw new BadRequestException('User tidak punya Accurate Customer Number');
    }

    // Force update ke kategori Umum (ID 50)
    const defaultCategoryId = 50;
    
    await this.accuratePricingService.updateCustomerCategory(
      user.accurateCustomerNo,
      defaultCategoryId
    );

    // Update database juga
    await this.usersService.update(id, { 
      accuratePriceCategoryId: defaultCategoryId 
    });

    return {
      success: true,
      message: `Customer berhasil direset ke kategori Umum (ID: ${defaultCategoryId})`,
      categoryId: defaultCategoryId,
      categoryName: 'Umum',
    };
  }

  // --- Endpoint untuk Toggle isActive ---
  @Patch(':id/toggle-active')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async toggleActiveStatus(@Param('id') id: string) {
    const updatedUser = await this.usersService.toggleIsActive(id);
    return {
      message: `Status pengguna berhasil diubah menjadi ${updatedUser.isActive ? 'Aktif' : 'Tidak Aktif'}.`,
      user: updatedUser
    };
  }

  // Endpoint Soft Delete
  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    const result = await this.usersService.remove(id);
    return { message: `Pengguna berhasil dinonaktifkan.` };
  }
}