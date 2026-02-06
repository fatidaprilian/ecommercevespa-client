// file: src/cart/cart.service.ts

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnprocessableEntityException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { DiscountsCalculationService } from 'src/discounts/discounts-calculation.service';
import { ProductsService } from 'src/products/products.service';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    private prisma: PrismaService,
    private discountsCalcService: DiscountsCalculationService,
    private productsService: ProductsService,
  ) { }

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
      throw new NotFoundException('User not found.');
    }

    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true,
                priceTiers: true,
                priceAdjustmentRules: { where: { isActive: true } },
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
        const processedProduct = await this.productsService.processProductWithPrice(
          item.product,
          {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name || ''
          }
        );

        return {
          ...item,
          product: processedProduct
        };
      }),
    );

    return {
      ...cart,
      items: processedItems
    };
  }

  async addItem(userId: string, addItemDto: AddItemDto) {
    const { productId, quantity } = addItemDto;
    const cart = await this.findOrCreateCart(userId);

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found.`);
    }

    const existingItem = await this.prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId },
    });

    const qtyInCart = existingItem?.quantity || 0;
    const requestedTotalQty = qtyInCart + quantity;

    if (product.stock < requestedTotalQty) {
      throw new UnprocessableEntityException(`Insufficient stock for product ${product.name}.`);
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
        'Quantity cannot be less than 1. Use remove endpoint to delete item.',
      );
    }

    const item = await this.prisma.cartItem.findFirst({
      where: { id: cartItemId, cart: { userId } },
      include: { product: true },
    });
    if (!item) {
      throw new ForbiddenException(
        'Access denied. Cart item not found or does not belong to you.',
      );
    }

    if (item.product.stock < quantity) {
      throw new UnprocessableEntityException(`Insufficient stock for product ${item.product.name}.`);
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
      this.logger.warn(
        `Attempt to remove non-existent cart item: ${cartItemId} for user: ${userId}`,
      );
      return this.getCart(userId);
    }

    await this.prisma.cartItem.delete({
      where: { id: item.id },
    });

    return this.getCart(userId);
  }
}