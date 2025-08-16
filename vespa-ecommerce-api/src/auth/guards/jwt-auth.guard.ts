// file: src/auth/guards/jwt-auth.guard.ts

import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  // Metode canActivate sekarang akan selalu mencoba menjalankan verifikasi
  canActivate(context: ExecutionContext) {
    // Dengan selalu memanggil super.canActivate(context), kita memastikan
    // logika verifikasi token dari Passport.js selalu berjalan.
    return super.canActivate(context);
  }

  // Metode handleRequest adalah kunci untuk autentikasi opsional.
  // Ia dipanggil SETELAH Passport.js mencoba memvalidasi token.
  handleRequest(err, user, info, context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Jika terjadi error (misal: token tidak valid, kadaluwarsa) atau user tidak ditemukan...
    if (err || !user) {
      // ...dan jika endpoint-nya adalah publik, kita tidak melempar error.
      // Kita cukup kembalikan null. Ini akan membuat req.user menjadi null
      // dan permintaan akan dilanjutkan sebagai anonim.
      if (isPublic) {
        return null;
      }

      // ...tetapi jika endpoint-nya dilindungi (bukan publik),
      // maka kita lemparkan error seperti seharusnya.
      throw err || new UnauthorizedException();
    }

    // Jika user berhasil divalidasi dari token, kembalikan data user.
    // Ini akan membuat req.user berisi payload dari token Anda.
    return user;
  }
}