// app/store/cart.ts
import { create } from 'zustand';
import { Product, ProductImage } from '../types';
import api from '@/lib/api';
import { debounce } from 'lodash';
import toast from 'react-hot-toast';

export type CartItem = {
  id: string;
  quantity: number;
  productId: string;
  product: Product & { images: ProductImage[]; weight?: number };
};

type Cart = {
  id: string;
  items: CartItem[];
};

// --- TAMBAHKAN ENUM INI ---
// (Enum yang sama dengan yang ada di backend DTO)
export enum PaymentPreference {
  CREDIT_CARD = 'credit_card',
  OTHER = 'other',
}
// --------------------------

const debouncedUpdateApi = debounce(async (cartItemId: string, quantity: number) => {
  try {
    await api.patch(`/cart/items/${cartItemId}`, { quantity });
  } catch (error) {
    console.error("Gagal sinkronisasi kuantitas:", error);
    toast.error('Gagal memperbarui keranjang.');
  }
}, 750);

type CartState = {
  cart: Cart | null;
  isLoading: boolean;
  isHydrated: boolean;
  selectedItems: Set<string>;
  error: string | null;
  
  fetchCart: () => Promise<void>;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  updateItemQuantity: (cartItemId: string, quantity: number) => void;
  removeItem: (cartItemId: string) => Promise<void>;
  toggleItemSelected: (cartItemId: string) => void;
  toggleSelectAll: (forceSelect?: boolean) => void;
  clearClientCart: () => void;
  
  // --- PERBARUI FUNGSI createOrder ---
  createOrder: (
    shippingAddress: string, 
    shippingCost: number, 
    courier: string, 
    destinationPostalCode: string, 
    destinationAreaId: string,
    paymentPreference?: PaymentPreference // <-- TAMBAHKAN parameter ini (opsional)
  ) => Promise<any>;
  // ------------------------------------
  
  getTotalWeight: () => number;
  getSummary: () => {
    subtotal: number;
    taxAmount: number;
    totalItems: number;
  };
};

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  isLoading: false,
  isHydrated: false,
  selectedItems: new Set(),
  error: null,

  clearClientCart: () => set({ cart: null, selectedItems: new Set(), isLoading: false, error: null, isHydrated: false }),

  fetchCart: async () => {
    if (get().isHydrated) return; 
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get('/cart');
      set({ cart: data, isLoading: false, isHydrated: true });
      get().toggleSelectAll(true);
    } catch (error) {
      console.error("Gagal mengambil keranjang:", error);
      set({ isLoading: false, error: 'Gagal memuat keranjang.', isHydrated: true });
    }
  },

  addItem: async (productId, quantity = 1) => {
    try {
      const { data } = await api.post('/cart/items', { productId, quantity });
      set({ cart: data });
      const updatedItem = data.items.find((item: CartItem) => item.productId === productId);
      if (updatedItem) {
        const currentSelected = get().selectedItems;
        currentSelected.add(updatedItem.id);
        set({ selectedItems: new Set(currentSelected) });
      }
    } catch (error: any) {
        const message = error.response?.data?.message || "Gagal menambah item ke keranjang.";
        toast.error(message);
    }
  },
  
  updateItemQuantity: (cartItemId, newQuantity) => {
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
  
  removeItem: async (cartItemId) => {
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

  toggleItemSelected: (cartItemId) => {
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

  toggleSelectAll: (forceSelect) => {
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

  getTotalWeight: () => {
    const { cart, selectedItems } = get();
    if (!cart) return 0;
    
    return cart.items
      .filter(item => selectedItems.has(item.id))
      .reduce((totalWeight, item) => {
        const itemWeight = item.product.weight || 1000; 
        return totalWeight + (itemWeight * item.quantity);
      }, 0);
  },
  
  getSummary: () => {
    const { cart, selectedItems } = get();
    if (!cart) return { subtotal: 0, taxAmount: 0, totalItems: 0 };

    const selectedCartItems = cart.items.filter(item => selectedItems.has(item.id));

    const subtotal = selectedCartItems.reduce((acc, item) => {
      return acc + (item.product.price * item.quantity);
    }, 0);
    
    // NOTE: taxAmount ini mungkin tidak akurat jika PPN dihitung di backend. 
    // Ini hanya untuk tampilan, perhitungan PPN final ada di backend.
    const taxAmount = subtotal * 0.11; 
    const totalItems = selectedCartItems.reduce((acc, item) => acc + item.quantity, 0);

    return { subtotal, taxAmount, totalItems };
  },

  // --- PERBARUI FUNGSI createOrder ---
  createOrder: async (
    shippingAddress, 
    shippingCost, 
    courier, 
    destinationPostalCode, 
    destinationAreaId,
    paymentPreference // <-- Terima parameter baru
  ) => {
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
        destinationPostalCode,
        destinationAreaId,
        paymentPreference, // <-- KIRIM KE API
      });
      
      set({ isLoading: false });
      return newOrder;
    } catch (error: any) {
      const message = error.response?.data?.message || "Gagal membuat pesanan.";
      toast.error(message);
      set({ isLoading: false });
      throw error;
    }
  },
  // ------------------------------------
}));