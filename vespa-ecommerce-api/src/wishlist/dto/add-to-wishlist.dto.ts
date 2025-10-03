// src/wishlist/dto/add-to-wishlist.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class AddToWishlistDto {
  @IsString()
  @IsNotEmpty()
  productId: string;
}