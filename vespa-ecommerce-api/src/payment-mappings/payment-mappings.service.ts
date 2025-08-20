import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePaymentMappingDto } from './dto/create-payment-mapping.dto';
import { UpdatePaymentMappingDto } from './dto/update-payment-mapping.dto';

@Injectable()
export class PaymentMappingsService {
  constructor(private prisma: PrismaService) {}

  create(createPaymentMappingDto: CreatePaymentMappingDto) {
    return this.prisma.paymentMethodMapping.create({
      data: createPaymentMappingDto,
    });
  }

  findAll() {
    return this.prisma.paymentMethodMapping.findMany();
  }

  findOne(id: string) {
    return this.prisma.paymentMethodMapping.findUnique({ where: { id } });
  }

  update(id: string, updatePaymentMappingDto: UpdatePaymentMappingDto) {
    return this.prisma.paymentMethodMapping.update({
      where: { id },
      data: updatePaymentMappingDto,
    });
  }

  remove(id: string) {
    return this.prisma.paymentMethodMapping.delete({ where: { id } });
  }
}