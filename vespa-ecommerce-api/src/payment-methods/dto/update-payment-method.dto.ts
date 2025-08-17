// file: vespa-ecommerce-api/src/payment-methods/dto/update-payment-method.dto.ts

import { PartialType } from '@nestjs/mapped-types';
import { CreatePaymentMethodDto } from './create-payment-method.dto';

export class UpdatePaymentMethodDto extends PartialType(CreatePaymentMethodDto) {}