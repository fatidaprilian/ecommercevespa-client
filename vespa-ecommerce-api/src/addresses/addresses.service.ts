// file: src/addresses/addresses.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto'; // <-- Impor

@Injectable()
export class AddressesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createAddressDto: CreateAddressDto) {
    return this.prisma.address.create({
      data: { ...createAddressDto, userId },
    });
  }

  async findAll(userId: string) {
    return this.prisma.address.findMany({ where: { userId }, orderBy: { isDefault: 'desc' } });
  }

  // ✅ METODE BARU
  async update(userId: string, addressId: string, updateAddressDto: UpdateAddressDto) {
    const address = await this.prisma.address.findUnique({ where: { id: addressId }});
    if (!address) throw new NotFoundException('Alamat tidak ditemukan.');
    if (address.userId !== userId) throw new ForbiddenException('Akses ditolak.');
    
    return this.prisma.address.update({
        where: { id: addressId },
        data: updateAddressDto,
    });
  }

  // ✅ METODE BARU
  async remove(userId: string, addressId: string) {
    const address = await this.prisma.address.findUnique({ where: { id: addressId }});
    if (!address) throw new NotFoundException('Alamat tidak ditemukan.');
    if (address.userId !== userId) throw new ForbiddenException('Akses ditolak.');

    await this.prisma.address.delete({ where: { id: addressId }});
    return { message: 'Alamat berhasil dihapus.' };
  }
}