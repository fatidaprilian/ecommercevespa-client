// file: src/users/users.controller.ts
import { Controller, Get, UseGuards, Req, ClassSerializerInterceptor, UseInterceptors, Patch, Param, Body, Delete } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { AuthenticatedRequest } from 'src/auth/interfaces/authenticated-request.interface';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
// Impor DTO baru yang akan kita buat nanti
import { UpdateProfileDto } from './dto/update-profile.dto'; 

@Controller('users')
@UseGuards(AuthGuard('jwt')) // Hapus RolesGuard dari level controller
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @UseGuards(RolesGuard)
  @Roles(Role.MEMBER, Role.RESELLER, Role.ADMIN) // Pastikan semua role bisa akses
  async getProfile(@Req() req: AuthenticatedRequest) {
    // ✅ PERBAIKAN UTAMA: Ambil data lengkap dari database
    return this.usersService.findById(req.user.id);
  }

  // Endpoint untuk UPDATE NAMA
  @Patch('profile')
  @UseGuards(RolesGuard)
  @Roles(Role.MEMBER, Role.RESELLER, Role.ADMIN)
  updateProfile(@Req() req: AuthenticatedRequest, @Body() updateProfileDto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, updateProfileDto);
  }
  
  // Endpoint lain (untuk Admin)
  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  @Patch(':id/role')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  updateRole(@Param('id') id: string, @Body() updateUserRoleDto: UpdateUserRoleDto) {
    return this.usersService.updateRole(id, updateUserRoleDto.role);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}