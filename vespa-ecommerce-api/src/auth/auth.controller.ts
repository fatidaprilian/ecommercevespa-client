// src/auth/auth.controller.ts

import {
  Controller,
  Post,
  Body,
  UseGuards,
  Res,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response, Request as ExpressRequest } from 'express';
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
import { AdminLocalAuthGuard } from './guards/admin-local-auth.guard'; // <-- Import Guard Admin
// LoginDto might be needed if you create a separate AdminLoginDto
// import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // --- Endpoint Login Pengguna Biasa (Original logic, uses LocalAuthGuard) ---
  @Public()
  @UseGuards(LocalAuthGuard) // Guard for regular users
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK) // Keep HttpCode OK (200)
  async login(@Req() req: ExpressRequest, @Res({ passthrough: true }) res: Response) {
    const { access_token } = await this.authService.login(req.user as any);

    res.cookie('auth_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      message: 'Login berhasil',
      user: req.user,
    };
  }
  // --- End Regular User Login ---


  // --- Endpoint BARU untuk Login Admin ---
  @Public()
  @UseGuards(AdminLocalAuthGuard) // Use the new Admin Guard (no turnstileToken check)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('admin/login')          // New endpoint route
  @HttpCode(HttpStatus.OK)
  async adminLogin(@Req() req: ExpressRequest, @Res({ passthrough: true }) res: Response) {
    const { access_token } = await this.authService.login(req.user as any);
    
    res.cookie('auth_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      message: 'Admin login berhasil',
      user: req.user,
    };
  }
  // --- Akhir Endpoint Admin ---


  // --- register (Original logic) ---
  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto); //
  }
  // --- End register ---


  // --- verify-email (Original logic) ---
  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Body() verificationDto: EmailVerificationDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyEmailToken(verificationDto);

    res.cookie('auth_token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      message: 'Verifikasi email berhasil!',
    };
  }
  // --- End verify-email ---


  // --- resend-verification (Original logic) ---
  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerificationEmail(@Body() resendDto: ResendVerificationDto) {
    return this.authService.resendVerificationEmail(resendDto.email); //
  }
  // --- End resend-verification ---


  // --- forgot-password (Original logic) ---
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto); //
  }
  // --- End forgot-password ---


  // --- validate-reset-token (Original logic) ---
  @Public()
  @Post('validate-reset-token')
  @HttpCode(HttpStatus.OK)
  async validateResetToken(@Body() validateTokenDto: ValidateResetTokenDto) {
    return this.authService.validateResetToken(validateTokenDto); //
  }
  // --- End validate-reset-token ---


  // --- reset-password (Original logic) ---
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto); //
  }
  // --- End reset-password ---


  // --- logout (Original logic) ---
  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: ExpressRequest, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.auth_token || req.headers.authorization?.split(' ')[1];
    if (token) {
      await this.authService.logout(token);
    }
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    return { message: 'Logout berhasil' };
  }
  // --- End logout ---

} // End of AuthController class
