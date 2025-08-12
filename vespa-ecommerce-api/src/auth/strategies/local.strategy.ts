import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { LoginDto } from '../dto/login.dto';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' }); // Memberitahu passport bahwa 'username' adalah field 'email'
  }

  async validate(email: string, pass: string): Promise<any> {
    const loginDto: LoginDto = { email, password: pass };
    const user = await this.authService.validateUser(loginDto);
    if (!user) {
      throw new UnauthorizedException('Kredensial tidak valid');
    }
    return user;
  }
}