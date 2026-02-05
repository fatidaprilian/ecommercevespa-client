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

export enum PaymentPreference {
  CREDIT_CARD = 'credit_card',
  OTHER = 'other',
}

// Map untuk menyimpan debounce function per item ID
const updateDebounces = new Map<string, Function>();

const getDebouncedUpdate = (cartItemId: string) => {
  if (!updateDebounces.has(cartItemId)) {
    updateDebounces.set(
      cartItemId,
      debounce(async (quantity: number, onSuccess: () => void, onError: () => void) => {
        try {
          await api.patch(`/cart/items/${cartItemId}`, { quantity });
          onSuccess();
        } catch (error) {
          console.error("Gagal sinkronisasi kuantitas:", error);
          toast.error('Gagal memperbarui keranjang.');
          onError();
        }
      }, 750)
    );
  }
  return updateDebounces.get(cartItemId);
};

type CartState = {
  cart: Cart | null;
  isLoading: boolean;
  isHydrated: boolean;
  selectedItems: Set<string>;
  error: string | null;

  // Set untuk melacak item yang sedang diedit lokal (pending API/debounce)
  // Agar tidak ditimpa oleh polling fetchCart
  updatingItemIds: Set<string>;

  // forceSilent = true artinya refresh data tanpa memicu loading spinner (untuk polling)
  fetchCart: (forceSilent?: boolean) => Promise<void>;

  addItem: (productId: string, quantity?: number) => Promise<void>;
  updateItemQuantity: (cartItemId: string, quantity: number) => void;
  removeItem: (cartItemId: string) => Promise<void>;
  toggleItemSelected: (cartItemId: string) => void;
  toggleSelectAll: (forceSelect?: boolean) => void;
  clearClientCart: () => void;

  createOrder: (
    shippingAddress: string,
    shippingCost: number,
    courier: string,
    destinationPostalCode: string,
    destinationAreaId: string,
    paymentPreference?: PaymentPreference
  ) => Promise<any>;

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
  updatingItemIds: new Set(), // Initial state
  error: null,

  clearClientCart: () => set({ cart: null, selectedItems: new Set(), isLoading: false, error: null, isHydrated: false, updatingItemIds: new Set() }),

  fetchCart: async (forceSilent = false) => {
    // Jika TIDAK dipaksa (initial load) DAN sudah ada data, skip biar hemat resource
    if (!forceSilent && get().isHydrated) return;

    // Hanya tampilkan loading spinner jika BUKAN silent refresh
    if (!forceSilent) {
      set({ isLoading: true, error: null });
    }

    try {
      const { data } = await api.get('/cart');

      set((state) => {
        // LOGIKA PENTING SAAT SILENT REFRESH:
        // Sinkronisasi selectedItems. Jika ada item yang dihapus dari backend (misal stok habis total),
        // kita harus hapus juga dari selectedItems agar tidak error saat checkout.
        const newCartItemIds = new Set(data.items.map((item: CartItem) => item.id));
        const newSelectedItems = new Set(state.selectedItems);

        // Cek setiap item yang terpilih, apakah masih ada di data keranjang baru?
        state.selectedItems.forEach(id => {
          if (!newCartItemIds.has(id)) {
            newSelectedItems.delete(id);
          }
        });

        // INTELLIGENT MERGE:
        // Jangan timpa item yang sedang di-update user
        let finalCart = data;
        if (state.cart && state.updatingItemIds.size > 0) {
          const mergedItems = data.items.map((serverItem: CartItem) => {
            if (state.updatingItemIds.has(serverItem.id)) {
              // Cari item versi lokal
              const localItem = state.cart!.items.find(i => i.id === serverItem.id);
              // Gunakan versi lokal (optimistic) jika ada, abaikan server sementara
              return localItem ? { ...serverItem, quantity: localItem.quantity } : serverItem;
            }
            return serverItem;
          });
          finalCart = { ...data, items: mergedItems };
        }

        return {
          cart: finalCart,
          isLoading: false,
          isHydrated: true,
          selectedItems: newSelectedItems
        };
      });

      // Auto-select semua HANYA saat fetch PERTAMA KALI.
      // Saat polling (silent refresh), jangan reset pilihan user.
      if (!get().isHydrated && !forceSilent) {
        get().toggleSelectAll(true);
      }

    } catch (error) {
      console.error("Gagal mengambil keranjang:", error);
      // Jika silent refresh gagal (misal koneksi putus sebentar), jangan tampilkan error heboh
      if (!forceSilent) {
        set({ isLoading: false, error: 'Gagal memuat keranjang.', isHydrated: true });
      }
    }
  },

  addItem: async (productId, quantity = 1) => {
    try {
      const { data } = await api.post('/cart/items', { productId, quantity });
      set({ cart: data });
      // Otomatis pilih item yang baru ditambahkan
      const updatedItem = data.items.find((item: CartItem) => item.productId === productId);
      if (updatedItem) {
        set(state => {
          const newSelected = new Set(state.selectedItems);
          newSelected.add(updatedItem.id);
          return { selectedItems: newSelected };
        });
      }
      toast.success("Produk berhasil ditambahkan ke keranjang");
    } catch (error: any) {
      const message = error.response?.data?.message || "Gagal menambah item ke keranjang.";
      toast.error(message);
    }
  },

  updateItemQuantity: (cartItemId, newQuantity) => {
    if (newQuantity < 1) return;

    // 1. Tandai item ini sedang di-update agar tidak ditimpa polling
    set(state => {
      const newUpdatingIds = new Set(state.updatingItemIds);
      newUpdatingIds.add(cartItemId);

      // Optimistic update
      if (!state.cart) return { updatingItemIds: newUpdatingIds };

      const updatedItems = state.cart.items.map(item =>
        item.id === cartItemId ? { ...item, quantity: newQuantity } : item
      );

      return {
        cart: { ...state.cart, items: updatedItems },
        updatingItemIds: newUpdatingIds
      };
    });

    // 2. Panggil debounce per item
    const debouncedFn = getDebouncedUpdate(cartItemId);

    // Callback saat API sukses/gagal -> lepaskan status 'updating'
    const releaseLock = () => {
      set(state => {
        const newUpdatingIds = new Set(state.updatingItemIds);
        newUpdatingIds.delete(cartItemId);
        return { updatingItemIds: newUpdatingIds };
      });
    };

    debouncedFn(newQuantity, releaseLock, releaseLock);
  },

  removeItem: async (cartItemId) => {
    const originalCart = get().cart;
    // Optimistic update
    set(state => {
      if (!state.cart) return {};
      const updatedItems = state.cart.items.filter(item => item.id !== cartItemId);
      const newSelected = new Set(state.selectedItems);
      newSelected.delete(cartItemId);
      return { cart: { ...state.cart, items: updatedItems }, selectedItems: newSelected };
    });
    try {
      await api.delete(`/cart/items/${cartItemId}`);
      toast.success("Item dihapus dari keranjang");
    } catch (error) {
      console.error("Gagal menghapus item:", error);
      toast.error("Gagal menghapus item");
      set({ cart: originalCart }); // Rollback jika gagal
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

    const taxAmount = subtotal * 0.11;
    const totalItems = selectedCartItems.reduce((acc, item) => acc + item.quantity, 0);

    return { subtotal, taxAmount, totalItems };
  },

  createOrder: async (
    shippingAddress,
    shippingCost,
    courier,
    destinationPostalCode,
    destinationAreaId,
    paymentPreference
  ) => {
    const { cart, selectedItems } = get();
    if (!cart || selectedItems.size === 0) {
      throw new Error("Tidak ada item yang dipilih untuk di-checkout.");
    }
    // Ambil hanya item yang diceklis
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
        paymentPreference,
      });

      // Setelah sukses order, biasanya keranjang akan kosong di backend.
      // Kita bisa refresh cart atau clear local state.
      // Opsi teraman adalah fetch ulang untuk sinkronisasi.
      await get().fetchCart(true);

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