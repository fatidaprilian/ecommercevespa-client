import { Module } from '@nestjs/common';
import { PaymentMappingsService } from './payment-mappings.service';
import { PaymentMappingsController } from './payment-mappings.controller';

@Module({
  controllers: [PaymentMappingsController],
  providers: [PaymentMappingsService],
})
export class PaymentMappingsModule {}