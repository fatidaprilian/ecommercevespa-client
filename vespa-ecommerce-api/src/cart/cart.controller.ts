// file: vespa-ecommerce-api/src/cart/cart.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { AuthenticatedRequest } from 'src/auth/interfaces/authenticated-request.interface';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@Req() req: AuthenticatedRequest) {
    return this.cartService.getCart(req.user.id);
  }

  @Post('items')
  addItem(@Req() req: AuthenticatedRequest, @Body() addItemDto: AddItemDto) {
    return this.cartService.addItem(req.user.id, addItemDto);
  }

  @Patch('items/:itemId')
  updateItem(
    @Req() req: AuthenticatedRequest,
    @Param('itemId') itemId: string,
    @Body() updateItemDto: UpdateItemDto,
  ) {
    return this.cartService.updateItemQuantity(req.user.id, itemId, updateItemDto);
  }

  @Delete('items/:itemId')
  removeItem(
    @Req() req: AuthenticatedRequest,
    @Param('itemId') itemId: string,
  ) {
    return this.cartService.removeItem(req.user.id, itemId);
  }
}