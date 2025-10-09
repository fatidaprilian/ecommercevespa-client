// src/cms-pages/cms-pages.module.ts
import { Module } from '@nestjs/common';
import { CmsPagesService } from './cms-pages.service';
import { CmsPagesController } from './cms-pages.controller';

@Module({
  controllers: [CmsPagesController],
  providers: [CmsPagesService],
})
export class CmsPagesModule {}