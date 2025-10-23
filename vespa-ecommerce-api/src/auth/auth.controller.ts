// src/auth/auth.controller.ts

import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  // Hapus 'Res' jika tidak digunakan lagi setelah perubahan ini
  // Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
// Hapus 'Response' jika tidak digunakan lagi
// import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Public } from 'src/auth/decorators/public.decorator';
import { AuthGuard } from '@nestjs/passport';
import { EmailVerificationDto } from './dto/email-verification.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ValidateResetTokenDto } from './dto/validate-reset-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  // --- 👇 HAPUS Parameter @Res dan response ---
  async login(@Request() req) {
    const { access_token } = await this.authService.login(req.user);

    // --- 👇 HAPUS BLOK KODE COOKIE INI ---
    // response.cookie('access_token', access_token, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === 'production',
    //   sameSite: 'strict',
    //   maxAge: 24 * 60 * 60 * 1000, // 1 day
    // });
    // ------------------------------------

    // Kembalikan token langsung di body respons
    return {
      message: 'Login berhasil',
      access_token: access_token,
    };
  }

  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  // --- 👇 HAPUS Parameter @Res dan response ---
  async verifyEmail(
    @Body() verificationDto: EmailVerificationDto,
    // @Res({ passthrough: true }) response: Response, // Hapus ini
  ) {
    const result = await this.authService.verifyEmailToken(verificationDto);

    // --- 👇 HAPUS BLOK KODE COOKIE INI ---
    // response.cookie('access_token', result.access_token, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === 'production',
    //   sameSite: 'strict',
    //   maxAge: 24 * 60 * 60 * 1000, // 1 day
    // });
    // ------------------------------------

    // Kembalikan token langsung di body respons
    return {
      message: 'Verifikasi email berhasil!',
      access_token: result.access_token,
    };
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerificationEmail(@Body() resendDto: ResendVerificationDto) {
    return this.authService.resendVerificationEmail(resendDto.email);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Public()
  @Post('validate-reset-token')
  @HttpCode(HttpStatus.OK)
  async validateResetToken(@Body() validateTokenDto: ValidateResetTokenDto) {
    return this.authService.validateResetToken(validateTokenDto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  // --- 👇 HAPUS Parameter @Res dan response (jika tidak ada logic lain) ---
  async logout(/*@Res({ passthrough: true }) response: Response*/) {
    // Hapus baris ini jika cookie sudah tidak digunakan sama sekali
    // response.clearCookie('access_token');
    return { message: 'Logout berhasil' };
  }
}