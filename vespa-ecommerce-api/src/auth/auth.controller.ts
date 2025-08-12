import { Controller, Post, Body, Res, Get, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth') // <-- PASTIKAN INI BENAR
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login') // <-- PASTIKAN INI BENAR
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken } = await this.authService.login(loginDto);
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: false, 
      sameSite: 'lax',
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24),
    });
    return { message: 'Login berhasil' };
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@Req() req) {
    const { password, ...user } = req.user;
    return user;
  }
}