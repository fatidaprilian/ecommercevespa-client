// File: src/payments/dto/retry-payment.dto.ts
import { IsEnum, IsOptional } from 'class-validator';
import { PaymentPreference } from 'src/orders/dto/create-order.dto'; // Import enum dari order DTO

export class RetryPaymentDto {
  @IsOptional()
  @IsEnum(PaymentPreference) // Validasi bahwa nilainya harus 'credit_card' atau 'other'
  paymentPreference?: PaymentPreference; // Bisa dikirim jika user ingin ganti metode
}