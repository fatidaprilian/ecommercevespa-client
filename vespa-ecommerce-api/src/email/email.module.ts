// file: src/email/email.module.ts

import { Module } from '@nestjs/common';
import { EmailService } from './email.service';

@Module({
  providers: [EmailService],
  exports: [EmailService], // Ini memastikan service bisa di-'inject' di modul lain
})
export class EmailModule {}