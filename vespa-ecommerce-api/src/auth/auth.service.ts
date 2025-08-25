// file: src/auth/auth.service.ts

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { EmailService } from 'src/email/email.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { User, Role } from '@prisma/client';
import { EmailVerificationDto } from './dto/email-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ValidateResetTokenDto } from './dto/validate-reset-token.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private prisma: PrismaService,
  ) {}

  async validateUser(loginDto: LoginDto): Promise<any> {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (user && (await bcrypt.compare(loginDto.password, user.password))) {
      if (!user.emailVerified && user.role !== Role.ADMIN) {
        await this.resendVerificationEmail(user.email);
        throw new UnauthorizedException(
          'Email Anda belum terverifikasi. Kami telah mengirim ulang email verifikasi.',
        );
      }
      const {
        password,
        verificationToken,
        verificationTokenExpires,
        passwordResetToken,
        passwordResetTokenExpires,
        ...result
      } = user;
      return result;
    }
    return null;
  }

  async login(user: User) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      name: user.name,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      if (!existingUser.emailVerified) {
        return this.resendVerificationEmail(registerDto.email);
      }
      throw new ConflictException('User dengan email ini sudah terdaftar');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const verificationToken = crypto.randomInt(100000, 999999).toString();
    const verificationTokenExpires = new Date(Date.now() + 10 * 60 * 1000);

    const newUser = await this.prisma.user.create({
      data: {
        ...registerDto,
        password: hashedPassword,
        verificationToken,
        verificationTokenExpires,
      },
    });

    try {
      await this.emailService.sendVerificationEmail(
        newUser.email,
        newUser.name || 'Pengguna Baru',
        verificationToken,
      );
    } catch (error) {
      await this.prisma.user.delete({ where: { id: newUser.id } });
      throw new Error(
        'Gagal mengirim email verifikasi. Silakan coba lagi nanti.',
      );
    }

    return {
      message:
        'Pendaftaran berhasil. Silakan cek email Anda untuk kode verifikasi.',
      email: newUser.email,
    };
  }

  async resendVerificationEmail(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new NotFoundException('User tidak ditemukan.');
    if (user.emailVerified)
      throw new BadRequestException('Email sudah terverifikasi.');

    const verificationToken = crypto.randomInt(100000, 999999).toString();
    const verificationTokenExpires = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.user.update({
      where: { email },
      data: { verificationToken, verificationTokenExpires },
    });

    await this.emailService.sendVerificationEmail(
      user.email,
      user.name || 'Pengguna',
      verificationToken,
    );

    return {
      message: 'Email verifikasi telah dikirim ulang.',
      email: user.email,
    };
  }
  
  async verifyEmailToken(verificationDto: EmailVerificationDto) {
    const { email, token } = verificationDto;

    const user = await this.prisma.user.findFirst({
      where: {
        email,
        verificationToken: token,
      },
    });

    if (!user || !user.verificationTokenExpires) {
      throw new UnauthorizedException('Kode verifikasi tidak valid.');
    }

    if (new Date() > user.verificationTokenExpires) {
      await this.resendVerificationEmail(email);
      throw new UnauthorizedException(
        'Kode verifikasi telah kedaluwarsa. Kode baru telah dikirim ke email Anda.',
      );
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        verificationToken: null,
        verificationTokenExpires: null,
      },
    });

    return this.login(updatedUser);
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      return { message: 'Jika email terdaftar, kami telah mengirimkan instruksi reset password.' };
    }

    const passwordResetToken = crypto.randomInt(100000, 999999).toString();
    const passwordResetTokenExpires = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.user.update({
      where: { email },
      data: { passwordResetToken, passwordResetTokenExpires },
    });

    try {
      await this.emailService.sendPasswordResetEmail(
        user.email,
        user.name || 'Pengguna',
        passwordResetToken,
      );
    } catch (error) {
      this.logger.error(`Gagal mengirim email reset password ke ${email}`, error);
    }
    
    return { message: 'Jika email terdaftar, kami telah mengirimkan instruksi reset password.' };
  }

  async validateResetToken(validateTokenDto: ValidateResetTokenDto) {
    const { token } = validateTokenDto;

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetTokenExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Kode reset tidak valid atau telah kedaluwarsa.');
    }

    return { message: 'Token valid.' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, password } = resetPasswordDto;

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetTokenExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Kode reset tidak valid atau telah kedaluwarsa.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetTokenExpires: null,
      },
    });

    return { message: 'Password berhasil direset. Silakan login kembali.' };
  }
}