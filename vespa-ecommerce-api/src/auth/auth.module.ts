// file: src/auth/auth.module.ts

import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from 'src/users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalStrategy } from './strategies/local.strategy';
import { EmailModule } from 'src/email/email.module';
import { AdminLocalStrategy } from './strategies/admin-local.strategy'; // <-- Import Strategy Admin

@Module({
  imports: [
    UsersModule,
    PassportModule,
    EmailModule,
    ConfigModule, // Pastikan ConfigModule diimpor jika belum
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy, // Strategy untuk user biasa
    AdminLocalStrategy, // <-- Tambahkan Strategy Admin di sini
  ],
})
export class AuthModule {}