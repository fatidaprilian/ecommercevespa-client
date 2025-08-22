// file: app/store/auth.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '../types';

type AuthState = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User | null, token: string | null) => void;
  _hasHydrated: boolean; // <-- Tambahkan state ini
  setHasHydrated: (hydrated: boolean) => void; // <-- Tambahkan fungsi ini
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false, // <-- State awal
      setAuth: (user, token) => set({
        user,
        token,
        isAuthenticated: !!token,
      }),
      setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }), // <-- Fungsi setter
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      // ✅ KUNCI PERBAIKAN: Tandai store sebagai "hydrated" setelah selesai memuat
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
        }
      },
    },
  ),
);