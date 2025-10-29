// file: src/users/users.controller.ts

import { Controller, Get, UseGuards, Req, ClassSerializerInterceptor, UseInterceptors, Patch, Param, Body, Delete, HttpCode, HttpStatus, Query } from '@nestjs/common'; // Tambahkan Query
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport'; // Pastikan AuthGuard diimpor
import { AuthenticatedRequest } from 'src/auth/interfaces/authenticated-request.interface';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
// Terapkan guard JWT secara global ke controller ini
@UseGuards(AuthGuard('jwt'), RolesGuard) // Tambahkan RolesGuard juga
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {} //

  // Endpoint untuk profil user yang sedang login (Member, Reseller, Admin)
  @Get('profile')
  @Roles(Role.MEMBER, Role.RESELLER, Role.ADMIN) // Peran yang diizinkan
  async getProfile(@Req() req: AuthenticatedRequest) {
    // Ambil user ID dari req.user yang ditambahkan oleh JwtAuthGuard
    return this.usersService.findById(req.user.id); //
  }

  // Endpoint untuk update profil user yang sedang login
  @Patch('profile')
  @Roles(Role.MEMBER, Role.RESELLER, Role.ADMIN) //
  updateProfile(@Req() req: AuthenticatedRequest, @Body() updateProfileDto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, updateProfileDto); //
  }

  // --- Endpoint Khusus Admin ---

  // --- Endpoint untuk user Aktif (default) ---
  @Get()
  @Roles(Role.ADMIN) // Hanya Admin
  findAllActive() { // Ganti nama agar lebih jelas
    return this.usersService.findAll(); //findAll sudah difilter hanya yg aktif
  }
  // --- Akhir Endpoint Aktif ---

  // --- Endpoint BARU untuk user Non-Aktif ---
  @Get('inactive') // Rute baru
  @Roles(Role.ADMIN) // Hanya Admin
  findAllInactive() {
      return this.usersService.findAllInactive(); // Panggil metode baru dari service
  }
  // --- Akhir Endpoint Non-Aktif ---

  @Get(':id')
  @Roles(Role.ADMIN) // Hanya Admin
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id); // findById bisa cari yg non-aktif juga
  }

  @Patch(':id')
  @Roles(Role.ADMIN) // Hanya Admin
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto); //
  }

  @Patch(':id/role')
  @Roles(Role.ADMIN) // Hanya Admin
  updateRole(@Param('id') id: string, @Body() updateUserRoleDto: UpdateUserRoleDto) {
    return this.usersService.updateRole(id, updateUserRoleDto.role); //
  }

  // --- Endpoint untuk Toggle isActive (Tetap sama) ---
  @Patch(':id/toggle-active')
  @Roles(Role.ADMIN) // Hanya Admin
  @HttpCode(HttpStatus.OK) // Status 200 OK
  async toggleActiveStatus(@Param('id') id: string) {
      const updatedUser = await this.usersService.toggleIsActive(id); //
      return {
          message: `Status pengguna berhasil diubah menjadi ${updatedUser.isActive ? 'Aktif' : 'Tidak Aktif'}.`, //
          user: updatedUser // Kembalikan user yang sudah diupdate
      };
  }
  // --- Akhir Endpoint Toggle ---

  // Endpoint Soft Delete (Tetap sama)
  @Delete(':id')
  @Roles(Role.ADMIN) // Hanya Admin
  @HttpCode(HttpStatus.OK) // Bisa OK (200) atau No Content (204)
  async remove(@Param('id') id: string) {
    const result = await this.usersService.remove(id); // Panggil metode remove yg sudah diubah
     return { message: `Pengguna berhasil dinonaktifkan.` }; // Sesuaikan pesan
  }
} // End of UsersController class