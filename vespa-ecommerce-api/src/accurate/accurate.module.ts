import { Module } from '@nestjs/common';
import { AccurateController } from './accurate.controller';
import { AccurateService } from './accurate.service';

@Module({
  controllers: [AccurateController],
  providers: [AccurateService]
})
export class AccurateModule {}
