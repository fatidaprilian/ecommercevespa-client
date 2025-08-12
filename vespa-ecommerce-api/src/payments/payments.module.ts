// src/payments/payments.module.ts

import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PrismaService } from 'src/prisma/prisma.service';
import Xendit from 'xendit-node';

@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PrismaService,
    {
      provide: 'XENDIT_CLIENT',
      useFactory: () => {
        // Validasi bahwa API Key sudah terpasang di .env
        const apiKey = process.env.XENDIT_API_KEY;
        if (!apiKey) {
          throw new Error('XENDIT_API_KEY is not set in environment variables');
        }
        return new Xendit({
          secretKey: apiKey,
        });
      },
    },
  ],
})
export class PaymentsModule {}