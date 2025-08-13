// file: vespa-ecommerce-api/src/auth/strategies/jwt.strategy.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

// Definisikan tipe data untuk payload JWT agar lebih jelas
export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

/**
 * Fungsi custom untuk memberitahu Passport cara mengekstrak JWT dari cookie.
 * @param req Objek request dari Express.
 * @returns Token JWT atau null jika tidak ditemukan.
 */
const cookieExtractor = (req: Request): string | null => {
  let token = null;
  // Periksa apakah request dan cookies ada, lalu ambil cookie bernama 'access_token'
  if (req && req.cookies) {
    token = req.cookies['access_token'];
  }
  return token;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in the environment variables');
    }

    super({
      // 1. Perubahan Kunci: Gunakan fungsi cookieExtractor
      jwtFromRequest: cookieExtractor,
      // 2. Pastikan ignoreExpiration false agar token yang kedaluwarsa ditolak
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  /**
   * Metode ini dijalankan setelah token berhasil diekstrak dan diverifikasi.
   * Payload yang sudah ter-dekripsi akan diteruskan ke sini.
   * @param payload Payload dari JWT.
   * @returns Objek user yang akan dilampirkan ke `req.user`.
   */
  async validate(payload: JwtPayload) {
    // 3. Kita percaya pada payload karena sudah divalidasi oleh signature.
    //    Ini lebih efisien karena tidak perlu query ke database setiap kali ada request.
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}