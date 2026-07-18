// file: src/auth/strategies/jwt.strategy.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserPayload } from '../interfaces/jwt.payload';
import { PrismaService } from '../../prisma/prisma.service';
import { Request } from 'express';
import { createClient, RedisClientType } from 'redis';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  name: string;
  jti?: string;
  iat?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly redisClient: RedisClientType;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in the environment variables');
    }

    super({
      // Extract from cookie 'auth_token', fallback to Authorization header
      jwtFromRequest: (req: Request) => {
        let token: string | null = null;
        if (req && req.cookies) {
          token = req.cookies['auth_token'];
        }
        if (!token && req.headers.authorization) {
          token = req.headers.authorization.split(' ')[1];
        }
        return token;
      },
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });

    this.redisClient = createClient({
      url: `redis://${this.configService.get<string>('REDIS_HOST')}:${this.configService.get<string>('REDIS_PORT')}`,
      password: this.configService.get<string>('REDIS_PASSWORD'),
    });
    this.redisClient.connect().catch(console.error);
  }

  /**
   * Metode ini dijalankan setelah token berhasil diekstrak dan diverifikasi.
   * REVISI: Sekarang kita cek ke Database untuk mendapatkan data user terbaru.
   */
  async validate(payload: JwtPayload): Promise<UserPayload> {
    // Check if token is blacklisted in Redis (H1)
    if (payload.jti) {
      const isBlacklisted = await this.redisClient.get(`bl_${payload.jti}`);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token ini telah di-logout (Blacklisted).');
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true, 
        name: true,
        isActive: true, 
        lastPasswordResetAt: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User tidak ditemukan atau tidak aktif.');
    }

    // Check if the token was issued before the last password reset (H2)
    if (user.lastPasswordResetAt && payload.iat) {
      const lastResetTimestamp = Math.floor(user.lastPasswordResetAt.getTime() / 1000);
      if (payload.iat < lastResetTimestamp) {
        throw new UnauthorizedException('Session kedaluwarsa karena password telah diubah.');
      }
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