// file: vespa-ecommerce-api/src/auth/strategies/jwt.strategy.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserPayload } from '../interfaces/jwt.payload'; 

// Definisikan tipe data untuk payload JWT mentah
export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

const cookieExtractor = (req: Request): string | null => {
  let token = null;
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
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        cookieExtractor,
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  /**
   * Metode ini dijalankan setelah token berhasil diekstrak dan diverifikasi.
   * @param payload Payload dari JWT.
   * @returns Objek user yang akan dilampirkan ke `req.user`.
   */
  async validate(payload: JwtPayload): Promise<UserPayload> {
    // Memetakan 'sub' dari token ke 'id' di objek user
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}