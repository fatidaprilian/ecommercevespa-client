// file: src/auth/strategies/jwt.strategy.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserPayload } from '../interfaces/jwt.payload';
// Import PrismaService untuk cek database
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  name: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService, // 👈 Inject Prisma di sini
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in the environment variables');
    }

    super({
      // Logika ekstraksi token tetap sama sesuai request
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  /**
   * Metode ini dijalankan setelah token berhasil diekstrak dan diverifikasi.
   * REVISI: Sekarang kita cek ke Database untuk mendapatkan data user terbaru.
   */
  async validate(payload: JwtPayload): Promise<UserPayload> {
    // 👇 Query ke DB berdasarkan ID (payload.sub)
    // Ini sangat cepat karena menggunakan Primary Key
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true, // ✨ Ambil role terbaru dari DB, bukan dari token
        name: true,
        isActive: true, // Bonus: Cek apakah user aktif
      },
    });

    // Jika user dihapus atau di-nonaktifkan/banned, tolak akses (401 Unauthorized)
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User tidak ditemukan atau tidak aktif.');
    }

    // Kembalikan data terbaru dari Database
    // Data ini akan masuk ke `req.user` di controller
    return {
      id: user.id,
      email: user.email,
      role: user.role, 
      name: user.name || '',
    };
  }
}