// file: vespa-ecommerce-api/src/auth/auth.service.ts

import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async register(registerDto: RegisterDto) {
    const { email, password, name } = registerDto;

    const userExists = await this.prisma.user.findUnique({
      where: { email },
    });

    if (userExists) {
      throw new ConflictException('Email sudah terdaftar');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await this.prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
      },
    });

    // Hapus password dari objek yang dikembalikan
    const { password: _, ...result } = newUser;
    return result;
  }
}