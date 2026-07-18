import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class AccurateWebhookGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const expected = this.configService.get<string>('ACCURATE_WEBHOOK_TOKEN');
    const received = req.query.token;

    if (!expected) {
        throw new UnauthorizedException('Missing Webhook Token (Not found in Server Env)');
    }
    if (!received) {
        throw new UnauthorizedException('Missing Webhook Token (Not found in URL query)');
    }

    const a = Buffer.from(String(received));
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Invalid Webhook Token');
    }
    return true;
  }
}
