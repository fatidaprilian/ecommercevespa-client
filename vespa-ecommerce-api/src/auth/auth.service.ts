// src/auth/auth.service.ts

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  /**
   * Memvalidasi pengguna berdasarkan email dan password.
   */
  async validateUser(loginDto: LoginDto): Promise<any> {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (user && (await bcrypt.compare(loginDto.password, user.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  /**
   * Menghasilkan token JWT untuk pengguna yang berhasil login.
   */
  async login(user: any) {
    // --- PERBAIKAN UTAMA DI SINI ---
    // Tambahkan 'name' ke dalam payload token
    const payload = { 
      email: user.email, 
      sub: user.id, 
      role: user.role,
      name: user.name, // Tambahkan baris ini
    };
    
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  /**
   * Mendaftarkan pengguna baru.
   */
  async register(registerDto: RegisterDto) {
    return this.usersService.create(registerDto);
  }
}