// file: vespa-ecommerce-api/src/auth/auth.controller.ts

import { Controller, Post, Body, UseGuards, Request, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Public } from 'src/auth/decorators/public.decorator';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req, @Res({ passthrough: true }) response: Response) {
    const { access_token } = await this.authService.login(req.user);

    // Set cookie untuk Admin Panel (httpOnly)
    response.cookie('access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 1 hari
    });

    // Kembalikan token di body untuk Customer Web (LocalStorage)
    return { 
      message: 'Login berhasil',
      access_token: access_token 
    };
  }

  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // Endpoint untuk logout (menghapus cookie di sisi client)
  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('access_token');
    return { message: 'Logout berhasil' };
  }
}