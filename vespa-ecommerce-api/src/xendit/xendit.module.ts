// file: vespa-ecommerce-api/src/xendit/xendit.module.ts

import { Module } from '@nestjs/common';
import { XenditService } from './xendit.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule], // Impor ConfigModule agar bisa dipakai di service
  providers: [XenditService],
  exports: [XenditService], // Export service agar bisa dipakai modul lain (seperti OrdersModule)
})
export class XenditModule {} // <-- TAMBAHKAN 'export'