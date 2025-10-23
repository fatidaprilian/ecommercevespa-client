// src/auth/strategies/jwt.strategy.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
// Hapus 'Request' jika cookieExtractor dihapus
// import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserPayload } from '../interfaces/jwt.payload';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  name: string;
}

// --- 👇 HAPUS FUNGSI cookieExtractor INI ---
// const cookieExtractor = (req: Request): string | null => {
//   let token = null;
//   if (req && req.cookies) {
//     token = req.cookies['access_token'];
//   }
//   return token;
// };
// -----------------------------------------

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in the environment variables');
    }

    super({
      // --- 👇 SEDERHANAKAN BAGIAN INI ---
      // Hanya ekstrak dari header Authorization
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Hapus array extractors:
      // jwtFromRequest: ExtractJwt.fromExtractors([
      //   ExtractJwt.fromAuthHeaderAsBearerToken(),
      //   cookieExtractor, // Hapus baris ini
      // ]),
      // ---------------------------------
      ignoreExpiration: false, // Biarkan false agar NestJS/Passport menangani token kedaluwarsa
      secretOrKey: jwtSecret,
    });
  }

  /**
   * Metode ini dijalankan setelah token berhasil diekstrak dan diverifikasi.
   * Payload dari JWT diteruskan ke sini.
   * Mengembalikan objek user yang akan dilampirkan ke `req.user`.
   */
  async validate(payload: JwtPayload): Promise<UserPayload> {
    // Bagian ini tidak perlu diubah
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      name: payload.name,
    };
  }
}