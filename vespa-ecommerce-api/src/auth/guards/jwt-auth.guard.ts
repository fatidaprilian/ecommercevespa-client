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

  canActivate(context: ExecutionContext) {
    // Selalu jalankan super.canActivate agar JwtStrategy dieksekusi 
    // dan req.user terisi jika ada token yang valid.
    return super.canActivate(context);
  }

  handleRequest(err, user, info, context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Jika route ini @Public(), izinkan masuk walaupun user tidak ada / token tidak valid
    if (isPublic) {
      return user || null;
    }

    // Jika bukan @Public() dan user tidak ada, lemparkan error Unauthorized
    if (err || !user) {
      throw err || new UnauthorizedException();
    }

    return user;
  }
}