import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  create(createProductDto: CreateProductDto) {
    // Kita perlu mengubah 'price' menjadi tipe Decimal
    const { price, ...rest } = createProductDto;
    return this.prisma.product.create({
      data: {
        ...rest,
        price: new Prisma.Decimal(price),
      },
    });
  }

  findAll() {
    return this.prisma.product.findMany({ include: { category: true } });
  }

  findOne(id: string) {
    return this.prisma.product.findUnique({ where: { id } });
  }

  update(id: string, updateProductDto: UpdateProductDto) {
    // Handle konversi harga jika ada
    const { price, ...rest } = updateProductDto;
    const data: Prisma.ProductUpdateInput = { ...rest };
    if (price) {
      data.price = new Prisma.Decimal(price);
    }

    return this.prisma.product.update({
      where: { id },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.product.delete({ where: { id } });
  }
}