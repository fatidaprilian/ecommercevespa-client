// src/wishlist/wishlist.controller.ts
import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req, HttpCode, HttpStatus, ConflictException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthenticatedRequest } from 'src/auth/interfaces/authenticated-request.interface';
import { WishlistService } from './wishlist.service';
import { AddToWishlistDto } from './dto/add-to-wishlist.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  getWishlist(@Req() req: AuthenticatedRequest) {
    return this.wishlistService.getWishlist(req.user);
  }

  @Get('/ids')
  getWishlistProductIds(@Req() req: AuthenticatedRequest) {
    return this.wishlistService.getWishlistProductIds(req.user.id);
  }

  @Post()
  async addToWishlist(
    @Req() req: AuthenticatedRequest,
    @Body() addToWishlistDto: AddToWishlistDto,
  ) {
    try {
        return await this.wishlistService.addToWishlist(
            req.user.id,
            addToWishlistDto.productId,
        );
    } catch (error) {
        if (error.code === 'P2002') {
            throw new ConflictException('Produk ini sudah ada di wishlist Anda.');
        }
        throw error;
    }
  }

  @Delete('/:productId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeFromWishlist(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.removeFromWishlist(req.user.id, productId);
  }
}