import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PaymentMappingsService } from './payment-mappings.service';
import { CreatePaymentMappingDto } from './dto/create-payment-mapping.dto';
import { UpdatePaymentMappingDto } from './dto/update-payment-mapping.dto';

@Controller('payment-mappings')
export class PaymentMappingsController {
  constructor(private readonly paymentMappingsService: PaymentMappingsService) {}

  @Post()
  create(@Body() createPaymentMappingDto: CreatePaymentMappingDto) {
    return this.paymentMappingsService.create(createPaymentMappingDto);
  }

  @Get()
  findAll() {
    return this.paymentMappingsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paymentMappingsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePaymentMappingDto: UpdatePaymentMappingDto) {
    return this.paymentMappingsService.update(id, updatePaymentMappingDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.paymentMappingsService.remove(id);
  }
}