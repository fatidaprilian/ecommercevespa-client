import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';

@Injectable()
export class PaymentMethodsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Membuat metode pembayaran manual baru dan kunci pemetaannya.
   */
  async create(createPaymentMethodDto: CreatePaymentMethodDto) {
    const { bankName, accountNumber, accountHolder, logoUrl, accurateBankName } = createPaymentMethodDto;

    // Contoh: "manual_bca_1234567890"
    const key = `manual_${bankName.toLowerCase().replace(/ /g, '_')}_${accountNumber}`;

    return this.prisma.manualPaymentMethod.create({
      data: {
        bankName,
        accountHolder,
        accountNumber,
        logoUrl,
        accurateBankName,
        paymentMethodKey: key,
      },
    });
  }

  findAll() {
    return this.prisma.manualPaymentMethod.findMany({
      orderBy: { bankName: 'asc' },
    });
  }

  findAllActive() {
    return this.prisma.manualPaymentMethod.findMany({
      where: { isActive: true },
      orderBy: { bankName: 'asc' },
    });
  }

  async findOne(id: string) {
    const method = await this.prisma.manualPaymentMethod.findUnique({
      where: { id },
    });
    if (!method) {
      throw new NotFoundException(`Metode pembayaran dengan ID ${id} tidak ditemukan.`);
    }
    return method;
  }

  /**
   * Memperbarui metode pembayaran.
   * Jika bankName atau accountNumber berubah, kita juga perbarui paymentMethodKey.
   */
  async update(id: string, updatePaymentMethodDto: UpdatePaymentMethodDto) {
    await this.findOne(id);

    const { bankName, accountNumber, ...rest } = updatePaymentMethodDto;
    const dataToUpdate: any = { ...rest };

    if (bankName || accountNumber) {
      const currentMethod = await this.findOne(id);
      const newBankName = bankName || currentMethod.bankName;
      const newAccountNumber = accountNumber || currentMethod.accountNumber;
      
      dataToUpdate.bankName = newBankName;
      dataToUpdate.accountNumber = newAccountNumber;
      dataToUpdate.paymentMethodKey = `manual_${newBankName.toLowerCase().replace(/ /g, '_')}_${newAccountNumber}`;
    }
    
    return this.prisma.manualPaymentMethod.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.manualPaymentMethod.delete({
      where: { id },
    });
  }
}