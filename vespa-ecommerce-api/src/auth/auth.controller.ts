// src/auth/auth.controller.ts

import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  // Res, // Original comment: Hapus 'Res' jika tidak digunakan lagi
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
// import { Response } from 'express'; // Original comment: Hapus 'Response' jika tidak digunakan lagi
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
  @UseGuards(LocalAuthGuard) // Guard for regular users (expects turnstileToken)
  @Post('login')
  @HttpCode(HttpStatus.OK) // Keep HttpCode OK (200)
  async login(@Request() req) {
    // req.user comes from LocalStrategy (which calls validateUser via AuthService)
    const { access_token } = await this.authService.login(req.user); //

    // Original comment: Hapus blok kode cookie ini
    // response.cookie('access_token', access_token, { ... });

    // Keep original response structure
    return {
      message: 'Login berhasil',
      access_token: access_token,
    };
  }
  // --- End Regular User Login ---


  // --- Endpoint BARU untuk Login Admin ---
  @Public()
  @UseGuards(AdminLocalAuthGuard) // Use the new Admin Guard (no turnstileToken check)
  @Post('admin/login')          // New endpoint route
  @HttpCode(HttpStatus.OK)
  async adminLogin(@Request() req) {
    // req.user comes from AdminLocalStrategy (which calls validateAdminUser via AuthService)
    const { access_token } = await this.authService.login(req.user); // login() method can be reused
    return {
      message: 'Admin login berhasil',
      access_token: access_token,
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
    // @Res({ passthrough: true }) response: Response, // Original comment: Hapus ini
  ) {
    const result = await this.authService.verifyEmailToken(verificationDto); //

    // Original comment: Hapus blok kode cookie ini
    // response.cookie('access_token', result.access_token, { ... });

    // Keep original response structure
    return {
      message: 'Verifikasi email berhasil!',
      access_token: result.access_token,
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
  async logout(/*@Res({ passthrough: true }) response: Response*/) { // Original comment: Hapus Parameter @Res
    // Original comment: Hapus baris ini jika cookie sudah tidak digunakan sama sekali
    // response.clearCookie('access_token');
    return { message: 'Logout berhasil' };
  }
  // --- End logout ---

} // End of AuthController class