// file: vespa-ecommerce-api/src/cart/cart.controller.ts

import { Controller, Get, Post, Body, Patch, Param, Delete, Req } from '@nestjs/common';
import { CartService } from './cart.service';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { AuthenticatedRequest } from 'src/auth/interfaces/authenticated-request.interface';

// Semua endpoint di sini memerlukan login
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@Req() req: AuthenticatedRequest) {
    const userId = req.user.id;
    return this.cartService.getCart(userId);
  }

  @Post('items')
  addItem(@Req() req: AuthenticatedRequest, @Body() addItemDto: AddItemDto) {
    const userId = req.user.id;
    return this.cartService.addItem(userId, addItemDto);
  }

  @Patch('items/:itemId')
  updateItem(
    @Req() req: AuthenticatedRequest,
    @Param('itemId') itemId: string,
    @Body() updateItemDto: UpdateItemDto,
  ) {
    const userId = req.user.id;
    return this.cartService.updateItemQuantity(userId, itemId, updateItemDto);
  }

  @Delete('items/:itemId')
  removeItem(@Req() req: AuthenticatedRequest, @Param('itemId') itemId: string) {
    const userId = req.user.id;
    return this.cartService.removeItem(userId, itemId);
  }
}