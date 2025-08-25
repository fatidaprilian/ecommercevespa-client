// file: vespa-ecommerce-api/src/upload/upload.controller.ts

import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Param,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Express } from 'express';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UploadProofDto } from './dto/upload-proof.dto';

@Controller('upload')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    return this.uploadService.uploadImageToCloudinary(file);
  }

  @Post('payment-proof/:orderId')
  @Roles(Role.RESELLER)
  @UseInterceptors(FileInterceptor('file'))
  async uploadProofOfPayment(
    @Param('orderId') orderId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadProofDto: UploadProofDto,
  ) {
    return this.uploadService.uploadProofOfPayment(
      orderId,
      file,
      uploadProofDto.manualPaymentMethodId,
    );
  }
}