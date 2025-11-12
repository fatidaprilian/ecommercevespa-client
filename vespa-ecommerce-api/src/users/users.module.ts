// src/users/users.module.ts

import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { AccuratePricingModule } from 'src/accurate-pricing/accurate-pricing.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    AccuratePricingModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}