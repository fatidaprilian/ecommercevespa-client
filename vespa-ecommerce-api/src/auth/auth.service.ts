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
import axios from 'axios'; // Keep this import if used elsewhere
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { EmailService } from 'src/email/email.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { User, Role } from '@prisma/client'; // Make sure Role is imported
import { EmailVerificationDto } from './dto/email-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ValidateResetTokenDto } from './dto/validate-reset-token.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  // Keep turnstileSecretKey logic if you intend to use it later,
  // otherwise, you can remove it and related parts if only admin login is needed now.
  private readonly turnstileSecretKey: string | undefined; // Make optional if not always needed

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private prisma: PrismaService,
    // Inject ConfigService only if needed (e.g., for turnstileSecretKey)
    private configService: ConfigService,
  ) {
    // Get Turnstile secret key only if the env var exists
    this.turnstileSecretKey = this.configService.get<string>(
      'TURNSTILE_SECRET_KEY',
    );
    // Add a check or warning if the key is missing but Turnstile logic is kept
    if (!this.turnstileSecretKey) {
        this.logger.warn('TURNSTILE_SECRET_KEY environment variable is not set. CAPTCHA verification will fail.');
    }
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

  // --- validateUser (Original logic, keep Turnstile check if needed for regular users) ---
  async validateUser(loginDto: LoginDto): Promise<any> {
    // --- Add Turnstile Validation (Only if this method is for regular users) ---
    // Make sure loginDto includes turnstileToken if this check is active
     if (!loginDto.turnstileToken){
        this.logger.error(`Login attempt missing CAPTCHA token for email: ${loginDto.email}`);
        throw new UnauthorizedException('Verifikasi CAPTCHA gagal (token hilang).');
     }
     const isHuman = await this.verifyTurnstileToken(loginDto.turnstileToken);
     if (!isHuman) {
       this.logger.warn(
         `Login attempt failed CAPTCHA for email: ${loginDto.email}`,
       );
       throw new UnauthorizedException('Verifikasi CAPTCHA gagal.');
     }
     this.logger.log(`CAPTCHA verified successfully for login: ${loginDto.email}`);
    // --- End Turnstile Validation ---

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
  // --- End validateUser ---


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

  // --- login (Original logic) ---
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
  // --- End login ---

  // --- register (Original logic, keep Turnstile check if needed for regular users) ---
  async register(registerDto: RegisterDto) {
    // --- Add Turnstile Validation (Only if this method is for regular users) ---
     if (!registerDto.turnstileToken){
        this.logger.error(`Registration attempt missing CAPTCHA token for email: ${registerDto.email}`);
        throw new BadRequestException('Verifikasi CAPTCHA gagal (token hilang).');
     }
     const isHuman = await this.verifyTurnstileToken(registerDto.turnstileToken);
     if (!isHuman) {
       this.logger.warn(
         `Registration attempt failed CAPTCHA for email: ${registerDto.email}`,
       );
       throw new BadRequestException('Verifikasi CAPTCHA gagal.');
     }
     this.logger.log(`CAPTCHA verified successfully for registration: ${registerDto.email}`);
    // --- End Turnstile Validation ---

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

    // Destructure to avoid passing turnstileToken to prisma create
    const { turnstileToken, ...userData } = registerDto;

    const newUser = await this.prisma.user.create({
      data: {
        ...userData, // Use data without token
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

    const verificationToken = crypto.randomInt(100000, 999999).toString();
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
  // --- End verifyEmailToken ---

  // --- forgotPassword (Original logic) ---
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (user) {
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
      },
    });

    return { message: 'Password berhasil direset. Silakan login kembali.' };
  }
  // --- End resetPassword ---

} // End of AuthService class