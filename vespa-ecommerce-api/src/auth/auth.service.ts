// file: src/auth/auth.service.ts

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
  InternalServerErrorException, // Keep this import if used elsewhere
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config'; // Keep this import if used elsewhere
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { createClient, RedisClientType } from 'redis';
import axios from 'axios';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { EmailService } from 'src/email/email.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { User, Role } from '@prisma/client'; // Make sure Role is imported
import { EmailVerificationDto } from './dto/email-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ValidateResetTokenDto } from './dto/validate-reset-token.dto';
import { AccuratePricingService } from '../accurate-pricing/accurate-pricing.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly turnstileSecretKey: string | undefined;
  private readonly redisClient: RedisClientType;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private prisma: PrismaService,
    // Inject ConfigService only if needed (e.g., for turnstileSecretKey)
    private configService: ConfigService,
    private readonly accuratePricingService: AccuratePricingService,
  ) {
    // Get Turnstile secret key only if the env var exists
    this.turnstileSecretKey = this.configService.get<string>(
      'TURNSTILE_SECRET_KEY',
    );
    if (!this.turnstileSecretKey) {
        this.logger.warn('TURNSTILE_SECRET_KEY environment variable is not set. Registration CAPTCHA verification will fail.');
    }

    // Initialize Redis client for token blacklist
    this.redisClient = createClient({
      url: `redis://${this.configService.get<string>('REDIS_HOST')}:${this.configService.get<string>('REDIS_PORT')}`,
      password: this.configService.get<string>('REDIS_PASSWORD'),
    });
    this.redisClient.on('error', (err) => this.logger.error('Redis Auth Client Error', err));
    this.redisClient.connect().catch(console.error);
  }

  // --- Helper function to verify Turnstile token (Keep if needed for user login/register) ---
  private async verifyTurnstileToken(token: string): Promise<boolean> {
    if (!this.turnstileSecretKey) {
        this.logger.error('Attempted to verify Turnstile token, but TURNSTILE_SECRET_KEY is not configured.');
        return false; // Fail if key is missing
    }
    const verificationUrl =
      'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    try {
      const response = await axios.post(
        verificationUrl,
        {
          secret: this.turnstileSecretKey,
          response: token,
        },
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );
      this.logger.debug(
        `Turnstile verification response: ${JSON.stringify(response.data)}`,
      );
      return response.data.success === true;
    } catch (error) {
      this.logger.error(
        'Error verifying Turnstile token:',
        error.response?.data || error.message,
      );
      return false;
    }
  }
  // --- End Helper ---

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


  // --- Method Baru untuk Validasi Admin (Tanpa Turnstile) ---
  async validateAdminUser(adminLoginDto: Pick<LoginDto, 'email' | 'password'>): Promise<any> {
    this.logger.log(`Attempting admin validation for: ${adminLoginDto.email}`);
    const user = await this.usersService.findByEmail(adminLoginDto.email);

    // Validasi email, password, DAN role ADMIN
    if (user && user.role === Role.ADMIN && (await bcrypt.compare(adminLoginDto.password, user.password))) {
      // Admin tidak perlu cek emailVerified
      const {
        password, // Exclude password
        verificationToken, // Exclude verification fields
        verificationTokenExpires,
        passwordResetToken,
        passwordResetTokenExpires,
        ...result // Keep the rest
      } = user;
      this.logger.log(`Admin validation successful for: ${adminLoginDto.email}`);
      return result;
    }
    this.logger.warn(`Admin validation failed for: ${adminLoginDto.email}`);
    return null; // Gagal jika email/password salah ATAU bukan admin
  }
  // --- Akhir Metode Baru ---

  // --- Change Password ---
  async changePassword(userId: string, changePasswordDto: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User tidak ditemukan.');
    }

    const isPasswordValid = await bcrypt.compare(changePasswordDto.oldPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Password lama salah.');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, salt);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Password berhasil diubah.' };
  }
  // --- End Change Password ---

  // --- login (Original logic) ---
  async login(user: User) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      name: user.name,
      jti: crypto.randomUUID(), // Unik ID untuk token agar bisa di-blacklist
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
  // --- End login ---

  async register(registerDto: RegisterDto) {
    this.logger.log(`Processing user registration for email: ${registerDto.email}`);

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
    const verificationToken = crypto.randomBytes(3).toString('hex').toUpperCase();
    const verificationTokenExpires = new Date(Date.now() + 10 * 60 * 1000);

    const newUser = await this.prisma.user.create({
      data: {
        name: registerDto.name,
        email: registerDto.email,
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
      this.logger.error(`Failed to send verification email to ${newUser.email}, rolling back user creation.`, error);
      await this.prisma.user.delete({ where: { id: newUser.id } });
      throw new InternalServerErrorException(
        'Gagal mengirim email verifikasi. Pendaftaran dibatalkan. Silakan coba lagi nanti.',
      );
    }

    return {
      message:
        'Pendaftaran berhasil. Silakan cek email Anda untuk kode verifikasi.',
      email: newUser.email,
    };
  }
  // --- End register ---

  // --- resendVerificationEmail (Original logic) ---
  async resendVerificationEmail(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new NotFoundException('User tidak ditemukan.');
    if (user.emailVerified)
      throw new BadRequestException('Email sudah terverifikasi.');

    const verificationToken = crypto.randomBytes(3).toString('hex').toUpperCase();
    const verificationTokenExpires = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.user.update({
      where: { email },
      data: { verificationToken, verificationTokenExpires },
    });

    try {
        await this.emailService.sendVerificationEmail(
        user.email,
        user.name || 'Pengguna',
        verificationToken,
        );
        return {
        message: 'Email verifikasi telah dikirim ulang.',
        email: user.email,
        };
    } catch (error) {
        this.logger.error(`Failed to resend verification email to ${email}`, error);
        throw new InternalServerErrorException('Gagal mengirim ulang email verifikasi.');
    }
  }
  // --- End resendVerificationEmail ---

  // --- verifyEmailToken (Original logic) ---
  async verifyEmailToken(verificationDto: EmailVerificationDto) {
    const { email, token } = verificationDto;

    const user = await this.prisma.user.findFirst({
      where: {
        email,
        verificationToken: token,
        verificationTokenExpires: { gt: new Date() },
      },
    });

    if (!user) {
        const userExists = await this.usersService.findByEmail(email);
        if (userExists && !userExists.emailVerified) {
            try {
            await this.resendVerificationEmail(email);
            throw new UnauthorizedException(
                'Kode verifikasi salah atau telah kedaluwarsa. Kode baru telah dikirim ulang ke email Anda.',
            );
            } catch (resendError) {
            throw new UnauthorizedException(
                'Kode verifikasi salah atau kedaluwarsa. Gagal mengirim ulang kode.',
            );
            }
        }
        throw new UnauthorizedException('Kode verifikasi tidak valid.');
    }

    // Integrated Accurate logic (Executed ONLY after email verification)
    let customerNo = user.accurateCustomerNo;
    if (!customerNo) {
      try {
        customerNo = await this.accuratePricingService.createCustomer({
          name: user.name || user.email,
          email: user.email,
        });
      } catch (error) {
        this.logger.error(
          `Gagal membuat customer di Accurate untuk user ${user.email}:`,
          error,
        );
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        verificationToken: null,
        verificationTokenExpires: null,
        ...(customerNo ? { accurateCustomerNo: customerNo } : {}),
      },
    });

    return this.login(updatedUser);
  }
  // --- End verifyEmailToken ---

  // --- forgotPassword (Original logic) ---
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (user) {
        const passwordResetToken = crypto.randomBytes(3).toString('hex').toUpperCase();
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
    } else {
        this.logger.warn(`Permintaan reset password untuk email tidak terdaftar: ${email}`);
    }

    return { message: 'Jika email terdaftar, kami telah mengirimkan instruksi reset password.' };
  }
  // --- End forgotPassword ---

  // --- validateResetToken (Original logic) ---
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
  // --- End validateResetToken ---

  // --- resetPassword (Original logic) ---
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
        lastPasswordResetAt: new Date(), // Revoke all old sessions (H2)
      },
    });

    return { message: 'Password berhasil direset. Silakan login kembali.' };
  }
  // --- End resetPassword ---

  // --- logout (Blacklist JTI) ---
  async logout(token: string) {
    try {
      const decoded: any = this.jwtService.decode(token);
      if (decoded && decoded.jti && decoded.exp) {
        const remainingTime = decoded.exp - Math.floor(Date.now() / 1000);
        if (remainingTime > 0) {
          await this.redisClient.setEx(`bl_${decoded.jti}`, remainingTime, '1');
          this.logger.debug(`Token ${decoded.jti} di-blacklist selama ${remainingTime} detik.`);
        }
      }
    } catch (error) {
      this.logger.error('Gagal melakukan blacklist token saat logout', error);
    }
  }

} // End of AuthService class
