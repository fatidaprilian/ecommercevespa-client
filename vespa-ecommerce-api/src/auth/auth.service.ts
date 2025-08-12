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
   * @param loginDto - Objek berisi email dan password.
   * @returns Data pengguna tanpa password jika valid, selain itu null.
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
   * @param user - Objek pengguna yang telah divalidasi.
   * @returns Object berisi access_token.
   */
  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  /**
   * Mendaftarkan pengguna baru.
   * Method ini memanggil UsersService untuk membuat entitas pengguna baru.
   * @param registerDto - Data untuk registrasi pengguna baru.
   * @returns Pengguna yang baru dibuat (tanpa password).
   */
  async register(registerDto: RegisterDto) {
    // Meneruskan DTO registrasi ke UsersService yang akan menangani
    // pengecekan duplikasi email dan hashing password.
    return this.usersService.create(registerDto);
  }
}