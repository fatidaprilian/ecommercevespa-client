// app/store/wishlist.ts
import { create } from 'zustand';
import toast from 'react-hot-toast';
import { getWishlistIds, addToWishlist, removeFromWishlist } from '@/services/wishlistService';

type WishlistState = {
  productIds: Set<string>;
  isHydrated: boolean;
  fetchWishlistIds: () => Promise<void>;
  toggleWishlist: (productId: string) => Promise<void>;
  isWishlisted: (productId: string) => boolean;
  clearWishlist: () => void;
};

export const useWishlistStore = create<WishlistState>((set, get) => ({
  productIds: new Set(),
  isHydrated: false,

  fetchWishlistIds: async () => {
    try {
      const ids = await getWishlistIds();
      set({ productIds: new Set(ids), isHydrated: true });
    } catch (error) {
      console.error("Gagal mengambil data wishlist:", error);
      set({ isHydrated: true }); // Tetap set hydrated meskipun gagal
    }
  },

  toggleWishlist: async (productId: string) => {
    const { productIds } = get();
    const isCurrentlyWishlisted = productIds.has(productId);
    const originalState = new Set(productIds);

    // Optimistic UI update
    const newProductIds = new Set(originalState);
    if (isCurrentlyWishlisted) {
      newProductIds.delete(productId);
    } else {
      newProductIds.add(productId);
    }
    set({ productIds: newProductIds });

    try {
      if (isCurrentlyWishlisted) {
        await removeFromWishlist(productId);
        toast.success("Dihapus dari wishlist!");
      } else {
        await addToWishlist(productId);
        toast.success("Ditambahkan ke wishlist!");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Gagal memperbarui wishlist.");
      // Rollback on error
      set({ productIds: originalState });
    }
  },

  isWishlisted: (productId: string) => {
    return get().productIds.has(productId);
  },

  clearWishlist: () => {
    set({ productIds: new Set(), isHydrated: false });
  },
}));