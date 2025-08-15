// file: vespa-ecommerce-web/app/store/cart.ts

import { create } from 'zustand';
import { Product, ProductImage } from '../types';
import api from '@/lib/api';
import { debounce } from 'lodash';

export type CartItem = {
  id: string; 
  quantity: number;
  product: Product & { images: ProductImage[] };
};

type Cart = {
  id: string;
  items: CartItem[];
};

// This function sends updates to the backend after a brief delay
const debouncedUpdateApi = debounce(async (cartItemId: string, quantity: number) => {
  try {
    await api.patch(`/cart/items/${cartItemId}`, { quantity });
  } catch (error) {
    console.error("Gagal sinkronisasi kuantitas:", error);
    // You could add logic here to revert the state if the API call fails
  }
}, 750);

type CartState = {
  cart: Cart | null;
  isLoading: boolean;
  selectedItems: Set<string>;
  error: string | null;
  
  fetchCart: () => Promise<void>;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  updateItemQuantity: (cartItemId: string, quantity: number) => void;
  removeItem: (cartItemId: string) => Promise<void>;
  toggleItemSelected: (cartItemId: string) => void;
  toggleSelectAll: (forceSelect?: boolean) => void;
  clearClientCart: () => void;
  createOrder: (shippingAddress: string, shippingCost: number, courier: string) => Promise<any>; 
};

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  isLoading: true,
  selectedItems: new Set(),
  error: null,

  clearClientCart: () => set({ cart: null, selectedItems: new Set(), isLoading: false, error: null }),

  fetchCart: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get('/cart');
      set({ cart: data, isLoading: false });
      get().toggleSelectAll(true);
    } catch (error) {
      console.error("Gagal mengambil keranjang:", error);
      set({ isLoading: false, error: 'Gagal memuat keranjang.' });
    }
  },

  addItem: async (productId: string, quantity = 1) => {
    try {
      const { data } = await api.post('/cart/items', { productId, quantity });
      set({ cart: data });
      const newItem = data.items.find((item: CartItem) => item.product.id === productId);
      if (newItem) {
        get().toggleItemSelected(newItem.id);
      }
    } catch (error) {
      console.error("Gagal menambah item:", error);
    }
  },

  // --- LOGIC REVISED AS REQUESTED ---
  updateItemQuantity: (cartItemId: string, newQuantity: number) => {
    // Enforce a minimum quantity of 1. Do nothing if it's less.
    if (newQuantity < 1) {
      return;
    }
    
    // Optimistically update the UI for a responsive feel
    set(state => {
      if (!state.cart) return {};
      const updatedItems = state.cart.items.map(item => 
        item.id === cartItemId ? { ...item, quantity: newQuantity } : item
      );
      return { cart: { ...state.cart, items: updatedItems } };
    });
    
    // Sync the change with the backend after a short delay
    debouncedUpdateApi(cartItemId, newQuantity);
  },
  
  removeItem: async (cartItemId: string) => {
    const originalCart = get().cart; // Save original state for fallback
    // Optimistically remove the item from the UI
    set(state => {
      if (!state.cart) return {};
      const updatedItems = state.cart.items.filter(item => item.id !== cartItemId);
      state.selectedItems.delete(cartItemId);
      return { cart: { ...state.cart, items: updatedItems }, selectedItems: new Set(state.selectedItems) };
    });

    try {
      // Call the backend to permanently delete the item
      await api.delete(`/cart/items/${cartItemId}`);
    } catch (error) {
      console.error("Gagal menghapus item:", error);
      // If the API call fails, revert the UI to its original state
      set({ cart: originalCart }); 
    }
  },

  toggleItemSelected: (cartItemId: string) => {
    set(state => {
      const newSelectedItems = new Set(state.selectedItems);
      if (newSelectedItems.has(cartItemId)) {
        newSelectedItems.delete(cartItemId);
      } else {
        newSelectedItems.add(cartItemId);
      }
      return { selectedItems: newSelectedItems };
    });
  },

  toggleSelectAll: (forceSelect?: boolean) => {
    set(state => {
      if (!state.cart) return {};
      const allItemIds = state.cart.items.map(item => item.id);
      const shouldSelectAll = forceSelect !== undefined ? forceSelect : state.selectedItems.size !== allItemIds.length;
      if (shouldSelectAll) {
        return { selectedItems: new Set(allItemIds) };
      } else {
        return { selectedItems: new Set() };
      }
    });
  },

  createOrder: async (shippingAddress: string, shippingCost: number, courier: string) => {
    const { cart, selectedItems } = get();
    if (!cart || selectedItems.size === 0) {
      throw new Error("Tidak ada item yang dipilih untuk di-checkout.");
    }
    const itemsToOrder = cart.items
      .filter(item => selectedItems.has(item.id))
      .map(item => ({ productId: item.product.id, quantity: item.quantity }));

    set({ isLoading: true });
    try {
      const { data: newOrder } = await api.post('/orders', {
        items: itemsToOrder,
        shippingAddress,
        shippingCost,
        courier,
      });
      
      await get().fetchCart(); // Refresh cart state after order
      set({ isLoading: false });
      return newOrder;
    } catch (error) {
      console.error("Gagal membuat pesanan:", error);
      set({ isLoading: false });
      throw error;
    }
  },
}));