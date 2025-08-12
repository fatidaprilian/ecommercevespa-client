import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '../types';

type AuthState = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User | null, token: string | null) => void;
};

export const useAuthStore = create<AuthState>()(
  // Gunakan middleware `persist` untuk menyimpan state
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => set({
        user,
        token,
        isAuthenticated: !!token,
      }),
    }),
    {
      name: 'auth-storage', // Nama key di localStorage
      storage: createJSONStorage(() => localStorage), // Gunakan localStorage
    },
  ),
);