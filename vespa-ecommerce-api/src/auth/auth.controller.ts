// vespa-ecommerce-api/src/auth/auth.controller.ts

import { Controller, Post, Body, UseGuards, Request, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LocalAuthGuard } from './guards/local-auth.guard'; // <-- PASTIKAN INI DI-IMPORT
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @UseGuards(LocalAuthGuard) // <-- TAMBAHKAN DECORATOR INI
  @Post('login')
  async login(@Request() req, @Res({ passthrough: true }) response: Response) {
    // Karena sudah melewati LocalAuthGuard, req.user dijamin sudah ada dan ter-validasi
    const { access_token } = await this.authService.login(req.user);

    response.cookie('access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // true jika di production
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 1 hari
    });

    return { message: 'Login berhasil' };
  }

  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }
}