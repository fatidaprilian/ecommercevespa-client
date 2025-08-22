// vespa-ecommerce-api/src/auth/strategies/local.strategy.ts

import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { LoginDto } from '../dto/login.dto'; // <-- Pastikan DTO di-import

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    // Konfigurasi agar passport-local tahu field mana yang digunakan untuk username
    super({ usernameField: 'email' });
  }

  /**
   * Metode ini secara otomatis dijalankan oleh LocalAuthGuard.
   * "username" dan "password" adalah nama default yang diambil dari body request.
   */
  async validate(email: string, pass: string): Promise<any> {
    // Buat objek DTO dari parameter yang diterima
    const loginDto: LoginDto = { email, password: pass };

    // Panggil validateUser dengan argumen yang benar (objek DTO)
    const user = await this.authService.validateUser(loginDto);

    if (!user) {
      // Jika user tidak ditemukan atau password salah, lempar error
      throw new UnauthorizedException('Email atau password salah.');
    }
    // Jika berhasil, kembalikan data user (tanpa password)
    return user;
  }
}