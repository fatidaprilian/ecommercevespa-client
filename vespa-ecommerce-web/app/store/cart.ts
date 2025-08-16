// file: app/store/cart.ts
import { create } from 'zustand';
import { Product, ProductImage } from '../types';
import api from '@/lib/api';
import { debounce } from 'lodash';
import toast from 'react-hot-toast';

export type CartItem = {
  id: string;
  quantity: number;
  productId: string;
  product: Product & { images: ProductImage[] };
};

type Cart = {
  id: string;
  items: CartItem[];
};

const debouncedUpdateApi = debounce(async (cartItemId: string, quantity: number) => {
  try {
    await api.patch(`/cart/items/${cartItemId}`, { quantity });
  } catch (error) {
    console.error("Gagal sinkronisasi kuantitas:", error);
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
  getTotalWeight: () => number; // <-- Tambahkan fungsi ini
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
    } catch (error: any) {
        const message = error.response?.data?.message || "Gagal menambah item ke keranjang.";
        toast.error(message);
    }
  },
  
  updateItemQuantity: (cartItemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    set(state => {
      if (!state.cart) return {};
      const updatedItems = state.cart.items.map(item => 
        item.id === cartItemId ? { ...item, quantity: newQuantity } : item
      );
      return { cart: { ...state.cart, items: updatedItems } };
    });
    debouncedUpdateApi(cartItemId, newQuantity);
  },
  
  removeItem: async (cartItemId: string) => {
    const originalCart = get().cart;
    set(state => {
      if (!state.cart) return {};
      const updatedItems = state.cart.items.filter(item => item.id !== cartItemId);
      state.selectedItems.delete(cartItemId);
      return { cart: { ...state.cart, items: updatedItems }, selectedItems: new Set(state.selectedItems) };
    });
    try {
      await api.delete(`/cart/items/${cartItemId}`);
    } catch (error) {
      console.error("Gagal menghapus item:", error);
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

  // --- FUNGSI BARU UNTUK MENGHITUNG TOTAL BERAT ---
  getTotalWeight: () => {
    const { cart, selectedItems } = get();
    if (!cart) return 0;
    
    // Hitung total berat dari item-item yang dipilih
    return cart.items
      .filter(item => selectedItems.has(item.id))
      .reduce((totalWeight, item) => {
        // Gunakan berat produk jika ada, jika tidak, gunakan default 1000 gram (1kg)
        const itemWeight = item.product.weight || 1000; 
        return totalWeight + (itemWeight * item.quantity);
      }, 0);
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
      
      await get().fetchCart();
      set({ isLoading: false });
      
      return newOrder; 
    } catch (error: any) {
      const message = error.response?.data?.message || "Gagal membuat pesanan.";
      toast.error(message);
      set({ isLoading: false });
      throw error;
    }
  },
}));