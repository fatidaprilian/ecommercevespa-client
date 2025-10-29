// src/auth/strategies/admin-local.strategy.ts

import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { LoginDto } from '../dto/login.dto'; // Bisa gunakan LoginDto
import { Role } from '@prisma/client'; // Import Role

@Injectable()
// Beri nama unik, misal 'admin-local'
export class AdminLocalStrategy extends PassportStrategy(Strategy, 'admin-local') {
  constructor(private authService: AuthService) {
    // Hanya perlu email dan password
    super({ usernameField: 'email' });
  }

  /**
   * Metode ini hanya memvalidasi email dan password untuk Admin,
   * TANPA turnstileToken.
   */
  async validate(email: string, pass: string): Promise<any> {
    // Buat objek DTO sederhana tanpa token
    const adminLoginDto = { email, password: pass } as LoginDto;

    // Panggil metode validasi khusus admin di AuthService
    const user = await this.authService.validateAdminUser(adminLoginDto); //

    if (!user) {
      // Pesan error spesifik untuk admin
      throw new UnauthorizedException('Admin email atau password salah, atau Anda bukan Admin.');
    }

    // Pastikan user adalah ADMIN (double check, meskipun service sudah melakukannya)
    if (user.role !== Role.ADMIN) {
        throw new UnauthorizedException('Akses ditolak. Hanya untuk Admin.');
    }

    return user; // Kembalikan data user jika validasi berhasil
  }
}