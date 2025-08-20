// file: vespa-ecommerce-api/src/accurate/accurate.module.ts

import { Module } from '@nestjs/common';
import { AccurateController } from './accurate.controller';
import { AccurateService } from './accurate.service';

@Module({
  controllers: [AccurateController],
  providers: [AccurateService],
  exports: [AccurateService]
})
export class AccurateModule {}