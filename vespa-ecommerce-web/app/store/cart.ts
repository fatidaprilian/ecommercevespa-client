// /app/store/cart.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Product } from '../types';

export type CartItem = {
  product: Product;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      totalItems: 0,
      totalPrice: 0,

      // Aksi untuk menambah item ke keranjang
      addItem: (product, quantity = 1) => {
        const { items } = get();
        const existingItem = items.find(
          (item) => item.product.id === product.id
        );

        let updatedItems;
        if (existingItem) {
          // Jika item sudah ada, update kuantitasnya
          updatedItems = items.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        } else {
          // Jika item baru, tambahkan ke array
          updatedItems = [...items, { product, quantity }];
        }
        
        set((state) => ({
          items: updatedItems,
          totalItems: state.totalItems + quantity,
          totalPrice: state.totalPrice + Number(product.price) * quantity,
        }));
      },

      // Aksi untuk menghapus item dari keranjang
      removeItem: (productId) => {
        const { items } = get();
        const itemToRemove = items.find((item) => item.product.id === productId);
        if (!itemToRemove) return;

        set((state) => ({
          items: state.items.filter((item) => item.product.id !== productId),
          totalItems: state.totalItems - itemToRemove.quantity,
          totalPrice: state.totalPrice - Number(itemToRemove.product.price) * itemToRemove.quantity,
        }));
      },

      // Aksi untuk mengubah kuantitas item
      updateQuantity: (productId, quantity) => {
        if (quantity < 1) {
          get().removeItem(productId);
          return;
        }

        let totalItems = 0;
        let totalPrice = 0;

        const updatedItems = get().items.map((item) => {
          if (item.product.id === productId) {
            return { ...item, quantity };
          }
          return item;
        });

        updatedItems.forEach(item => {
          totalItems += item.quantity;
          totalPrice += Number(item.product.price) * item.quantity;
        });

        set({ items: updatedItems, totalItems, totalPrice });
      },

      // Aksi untuk mengosongkan keranjang
      clearCart: () => set({ items: [], totalItems: 0, totalPrice: 0 }),
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);