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

// Fungsi ini mengirim pembaruan ke backend setelah jeda singkat
const debouncedUpdateApi = debounce(async (cartItemId: string, quantity: number) => {
  try {
    await api.patch(`/cart/items/${cartItemId}`, { quantity });
  } catch (error) {
    console.error("Gagal sinkronisasi kuantitas:", error);
    // Anda bisa menambahkan logika di sini untuk mengembalikan state jika panggilan API gagal
  }
}, 750); // Menunggu 750ms setelah interaksi terakhir sebelum mengirim request

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
      // Secara default, pilih semua item saat keranjang pertama kali dimuat
      get().toggleSelectAll(true);
    } catch (error) {
      console.error("Gagal mengambil keranjang:", error);
      set({ isLoading: false, error: 'Gagal memuat keranjang.' });
    }
  },

  addItem: async (productId: string, quantity = 1) => {
    try {
      // Backend akan merespons dengan state keranjang terbaru
      const { data } = await api.post('/cart/items', { productId, quantity });
      set({ cart: data });
      // Cari item yang baru ditambahkan dan langsung pilih
      const newItem = data.items.find((item: CartItem) => item.product.id === productId);
      if (newItem) {
        get().toggleItemSelected(newItem.id);
      }
    } catch (error) {
      console.error("Gagal menambah item:", error);
    }
  },

  // --- LOGIKA UTAMA: UPDATE KUANTITAS SECARA OPTIMISTIS ---
  updateItemQuantity: (cartItemId: string, newQuantity: number) => {
    // Batasi kuantitas minimal 1. Jangan lakukan apa-apa jika kurang.
    if (newQuantity < 1) {
      return;
    }
    
    // 1. Update UI secara langsung agar terasa responsif
    set(state => {
      if (!state.cart) return {};
      const updatedItems = state.cart.items.map(item => 
        item.id === cartItemId ? { ...item, quantity: newQuantity } : item
      );
      return { cart: { ...state.cart, items: updatedItems } };
    });
    
    // 2. Sinkronisasikan perubahan dengan backend setelah jeda singkat
    debouncedUpdateApi(cartItemId, newQuantity);
  },
  
  // --- LOGIKA UTAMA: HAPUS ITEM SECARA OPTIMISTIS ---
  removeItem: async (cartItemId: string) => {
    const originalCart = get().cart; // Simpan state asli untuk fallback jika gagal

    // 1. Hapus item dari UI secara langsung
    set(state => {
      if (!state.cart) return {};
      const updatedItems = state.cart.items.filter(item => item.id !== cartItemId);
      // Hapus juga dari item yang terseleksi
      state.selectedItems.delete(cartItemId);
      return { cart: { ...state.cart, items: updatedItems }, selectedItems: new Set(state.selectedItems) };
    });

    try {
      // 2. Panggil backend untuk menghapus item secara permanen
      await api.delete(`/cart/items/${cartItemId}`);
    } catch (error) {
      console.error("Gagal menghapus item:", error);
      // 3. Jika API gagal, kembalikan UI ke state aslinya
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
      // Tentukan apakah harus memilih semua atau tidak
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
    // Siapkan data item yang akan dikirim ke API
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
      
      // Setelah order berhasil, muat ulang state keranjang (yang seharusnya sudah kosong)
      await get().fetchCart();
      set({ isLoading: false });
      return newOrder;
    } catch (error) {
      console.error("Gagal membuat pesanan:", error);
      set({ isLoading: false });
      throw error;
    }
  },
}));