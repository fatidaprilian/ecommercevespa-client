// app/services/wishlistService.ts
import api from '@/lib/api';
import { Product } from '@/types';

export interface WishlistItem {
  id: string;
  productId: string;
  product: Product;
}

export const getWishlist = async (): Promise<WishlistItem[]> => {
  const { data } = await api.get('/wishlist');
  return data;
};

export const getWishlistIds = async (): Promise<string[]> => {
  const { data } = await api.get('/wishlist/ids');
  return data;
};

export const addToWishlist = async (productId: string): Promise<void> => {
  await api.post('/wishlist', { productId });
};

export const removeFromWishlist = async (productId: string): Promise<void> => {
  await api.delete(`/wishlist/${productId}`);
};