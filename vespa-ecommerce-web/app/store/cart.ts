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

// Map to store debounce functions per item ID
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
          console.error("Failed to sync quantity:", error);
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

  // Set to track items being edited locally (pending API/debounce)
  // Prevents overwriting by polling fetchCart
  updatingItemIds: Set<string>;

  // forceSilent = true means refresh data without triggering loading spinner (for polling)
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
    // If NOT forced (initial load) AND already hydrated, skip to save resources
    if (!forceSilent && get().isHydrated) return;

    // Only show loading spinner if NOT silent refresh
    if (!forceSilent) {
      set({ isLoading: true, error: null });
    }

    try {
      const { data } = await api.get('/cart');

      set((state) => {
        // IMPORTANT LOGIC FOR SILENT REFRESH:
        // Sync selectedItems. If an item is removed from backend (e.g. out of stock),
        // we must also remove it from selectedItems to avoid error during checkout.
        const newCartItemIds = new Set(data.items.map((item: CartItem) => item.id));
        const newSelectedItems = new Set(state.selectedItems);

        // Check each selected item, does it still exist in new cart data?
        state.selectedItems.forEach(id => {
          if (!newCartItemIds.has(id)) {
            newSelectedItems.delete(id);
          }
        });

        // INTELLIGENT MERGE:
        // Do not overwrite items being updated by user
        let finalCart = data;
        if (state.cart && state.updatingItemIds.size > 0) {
          const mergedItems = data.items.map((serverItem: CartItem) => {
            if (state.updatingItemIds.has(serverItem.id)) {
              // Find local version
              const localItem = state.cart!.items.find(i => i.id === serverItem.id);
              // Use local version (optimistic) if exists, ignore server temporarily
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

      // Auto-select all ONLY on FIRST fetch.
      // During polling (silent refresh), do not reset user selection.
      if (!get().isHydrated && !forceSilent) {
        get().toggleSelectAll(true);
      }

    } catch (error) {
      console.error("Failed to fetch cart:", error);
      // If silent refresh fails (e.g. connection lost), do not show error
      if (!forceSilent) {
        set({ isLoading: false, error: 'Gagal memuat keranjang.', isHydrated: true });
      }
    }
  },

  addItem: async (productId, quantity = 1) => {
    try {
      const { data } = await api.post('/cart/items', { productId, quantity });
      set({ cart: data });
      // Automatically select newly added item
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

    // 1. Mark this item as being updated so polling doesn't overwrite it
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

    // 2. Call debounce per item
    const debouncedFn = getDebouncedUpdate(cartItemId);

    // Callback on API success/error -> release 'updating' lock
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
      console.error("Failed to remove item:", error);
      toast.error("Gagal menghapus item");
      set({ cart: originalCart }); // Rollback if failed
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
    // Get only selected items
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

      // After successful order, cart is usually emptied in backend.
      // We can refresh cart or clear local state.
      // Safest option is to fetch again to sync.
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