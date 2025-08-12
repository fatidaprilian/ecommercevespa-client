import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { XenditModule } from 'src/xendit/xendit.module';

@Module({
  // Cukup impor XenditModule.
  // NestJS akan secara otomatis menyediakan XenditService untuk PaymentsService.
  imports: [XenditModule],
  controllers: [PaymentsController],
  // Tidak perlu lagi menyediakan PrismaService atau XENDIT_CLIENT di sini.
  providers: [PaymentsService],
})
export class PaymentsModule {}