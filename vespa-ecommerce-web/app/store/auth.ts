// vespa-ecommerce-web/src/store/auth.ts

import { create } from 'zustand';
import { User } from '../types'; // Kita akan buat tipe User nanti

// Definisikan tipe untuk state dan actions
type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
}));