// vespa-ecommerce-api/src/auth/auth.controller.ts

import { Controller, Post, Body, Res, Get, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken } = await this.authService.login(loginDto);
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: false, // Di production, ini harus `true`
      sameSite: 'lax',
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // Cookie 7 hari
    });
    return { message: 'Login berhasil' };
  }
  
  // Endpoint untuk mengambil data profil pengguna yang sedang login
  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@Req() req) {
    // req.user didapat dari validasi JwtStrategy
    const { password, ...user } = req.user;
    return user;
  }

  // --- TAMBAHAN BARU ---
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    // Menghapus cookie dengan nama 'access_token'
    res.clearCookie('access_token');
    return { message: 'Logout berhasil' };
  }
  // --- AKHIR TAMBAHAN ---
}