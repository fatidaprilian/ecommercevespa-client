// vespa-ecommerce-api/src/auth/strategies/local.strategy.ts

import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Req } from '@nestjs/common'; // Import Req
import { Request } from 'express'; // Import Request from express
import { AuthService } from '../auth.service';
import { LoginDto } from '../dto/login.dto';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    // Modify super call to pass the request to the validate function
    super({
      usernameField: 'email',
      passReqToCallback: true, // Add this line
    });
  }

  /**
   * Metode ini secara otomatis dijalankan oleh LocalAuthGuard.
   * Parameter pertama sekarang adalah objek Request karena passReqToCallback: true.
   */
  async validate(
    @Req() req: Request, // Add request object as the first parameter
    email: string, // email is the second parameter now
    pass: string, // password is the third parameter now
  ): Promise<any> {
    // Extract turnstileToken from the request body
    const turnstileToken = req.body.turnstileToken;

    // Check if turnstileToken exists
    if (!turnstileToken) {
      // You might want more specific logging or error handling here
      throw new UnauthorizedException('CAPTCHA token is missing.');
    }

    // Create the complete LoginDto including the token
    const loginDto: LoginDto = { email, password: pass, turnstileToken };

    // Call validateUser with the complete DTO
    const user = await this.authService.validateUser(loginDto); //

    if (!user) {
      // Keep original error for failed user validation
      throw new UnauthorizedException('Email atau password salah.');
    }
    // Keep original success return
    return user;
  }
}