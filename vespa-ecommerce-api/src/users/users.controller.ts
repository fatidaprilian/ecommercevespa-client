// src/users/users.controller.ts
import { Controller, Get, UseGuards, Req, ClassSerializerInterceptor, UseInterceptors } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { AuthenticatedRequest } from 'src/auth/interfaces/authenticated-request.interface';

@Controller('users')
// Gunakan interceptor untuk menyembunyikan properti yang dikecualikan (seperti password)
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Endpoint untuk mengambil data profil pengguna yang sedang login
  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@Req() req: AuthenticatedRequest) {
    // Dengan ClassSerializerInterceptor, password akan otomatis disembunyikan
    return req.user;
  }
}