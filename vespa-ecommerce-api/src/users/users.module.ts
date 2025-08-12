import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  controllers: [UsersController],
  providers: [UsersService], // PrismaService dihapus dari sini
  exports: [UsersService],
})
export class UsersModule {}