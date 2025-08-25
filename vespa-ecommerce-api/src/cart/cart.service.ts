// file: vespa-ecommerce-api/src/cart/cart.service.ts

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { DiscountsCalculationService } from 'src/discounts/discounts-calculation.service';
import { Role } from '@prisma/client';

@Injectable()
export class CartService {
  constructor(
    private prisma: PrismaService,
    private discountsCalcService: DiscountsCalculationService,
  ) {}

  private async findOrCreateCart(userId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
    });
    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
      });
    }
    return cart;
  }

  async getCart(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        throw new NotFoundException('User tidak ditemukan.');
    }

    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true,
              },
            },
          },
          orderBy: {
            product: {
              name: 'asc',
            },
          },
        },
      },
    });

    if (!cart) {
      return this.prisma.cart.create({
        data: { userId },
        include: { items: true },
      });
    }

    const processedItems = await Promise.all(
      cart.items.map(async (item) => {
        let priceInfo;
        if (user.role === Role.RESELLER) {
          priceInfo = await this.discountsCalcService.calculatePrice(user, item.product);
        } else {
          priceInfo = {
            originalPrice: item.product.price,
            discountPercentage: 0,
            finalPrice: item.product.price,
            appliedRule: 'NONE',
          };
        }
        
        item.product.price = priceInfo.finalPrice;
        (item.product as any).priceInfo = priceInfo;
        return item;
      })
    );
    cart.items = processedItems;

    return cart;
  }

  async addItem(userId: string, addItemDto: AddItemDto) {
    const { productId, quantity } = addItemDto;
    const cart = await this.findOrCreateCart(userId);

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Produk dengan ID ${productId} tidak ditemukan.`);
    }

    const existingItem = await this.prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId },
    });

    const qtyInCart = existingItem?.quantity || 0;
    const requestedTotalQty = qtyInCart + quantity;

    if (product.stock < requestedTotalQty) {
      throw new UnprocessableEntityException(`Stok untuk produk ${product.name} tidak mencukupi.`);
    }

    if (existingItem) {
      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: { increment: quantity } },
      });
    } else {
      await this.prisma.cartItem.create({
        data: { cartId: cart.id, productId, quantity },
      });
    }
    return this.getCart(userId);
  }

  async updateItemQuantity(
    userId: string,
    cartItemId: string,
    updateItemDto: UpdateItemDto,
  ) {
    const { quantity } = updateItemDto;
    if (quantity < 1) {
      throw new ForbiddenException(
        'Kuantitas tidak boleh kurang dari 1. Gunakan endpoint hapus untuk menghilangkan item.',
      );
    }

    const item = await this.prisma.cartItem.findFirst({
      where: { id: cartItemId, cart: { userId } },
      include: { product: true }
    });
    if (!item) {
      throw new ForbiddenException(
        'Akses ditolak. Item keranjang tidak ditemukan atau bukan milik Anda.',
      );
    }
    
    if(item.product.stock < quantity){
      throw new UnprocessableEntityException(`Stok untuk produk ${item.product.name} tidak mencukupi.`)
    }

    await this.prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity },
    });

    return this.getCart(userId);
  }

  async removeItem(userId: string, cartItemId: string) {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: cartItemId, cart: { userId } },
    });

    if (!item) {
      console.warn(
        `Upaya menghapus item keranjang yang tidak ada: ${cartItemId} untuk user: ${userId}`,
      );
      return this.getCart(userId);
    }

    await this.prisma.cartItem.delete({
      where: { id: item.id },
    });

    return this.getCart(userId);
  }
}