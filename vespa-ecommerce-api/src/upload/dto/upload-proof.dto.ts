// src/upload/dto/upload-proof.dto.ts

import { IsNotEmpty, IsString } from 'class-validator';

export class UploadProofDto {
  @IsString()
  @IsNotEmpty()
  manualPaymentMethodId: string;
}