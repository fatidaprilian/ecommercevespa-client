import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // <-- Tandai sebagai Global!
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}