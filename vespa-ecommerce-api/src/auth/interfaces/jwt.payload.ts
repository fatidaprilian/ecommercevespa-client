// src/auth/interfaces/jwt.payload.ts

export interface JwtPayload {
  sub: string; // 'sub' adalah nama standar untuk subject (ID User)
  email: string;
}