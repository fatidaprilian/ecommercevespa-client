// file: vespa-ecommerce-api/src/payment-methods/payment-methods.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';

@Injectable()
export class PaymentMethodsService {
  constructor(private prisma: PrismaService) {}

  // Membuat metode pembayaran baru
  create(createPaymentMethodDto: CreatePaymentMethodDto) {
    return this.prisma.manualPaymentMethod.create({
      data: createPaymentMethodDto,
    });
  }

  // Menampilkan semua metode pembayaran
  findAll() {
    return this.prisma.manualPaymentMethod.findMany({
      orderBy: { bankName: 'asc' },
    });
  }

  // Menampilkan hanya yang aktif (untuk customer)
  findAllActive() {
    return this.prisma.manualPaymentMethod.findMany({
      where: { isActive: true },
      orderBy: { bankName: 'asc' },
    });
  }

  // Menemukan satu metode pembayaran
  async findOne(id: string) {
    const method = await this.prisma.manualPaymentMethod.findUnique({
      where: { id },
    });
    if (!method) {
      throw new NotFoundException(`Metode pembayaran dengan ID ${id} tidak ditemukan.`);
    }
    return method;
  }

  // Memperbarui metode pembayaran
  async update(id: string, updatePaymentMethodDto: UpdatePaymentMethodDto) {
    await this.findOne(id); // Pastikan data ada sebelum update
    return this.prisma.manualPaymentMethod.update({
      where: { id },
      data: updatePaymentMethodDto,
    });
  }

  // Menghapus metode pembayaran
  async remove(id: string) {
    await this.findOne(id); // Pastikan data ada sebelum dihapus
    return this.prisma.manualPaymentMethod.delete({
      where: { id },
    });
  }
}