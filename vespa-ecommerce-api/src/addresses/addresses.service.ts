import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';

@Injectable()
export class AddressesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createAddressDto: CreateAddressDto) {
    return this.prisma.address.create({
      data: { ...createAddressDto, userId },
    });
  }

  async findAll(userId: string) {
    return this.prisma.address.findMany({ where: { userId } });
  }

  // Nanti kita bisa tambahkan update & delete
}