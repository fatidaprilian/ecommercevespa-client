import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '../types';

type AuthState = {
  user: User | null;
  // token: string | null; // JWT token is now stored in HTTP-Only cookies
  isAuthenticated: boolean;
  setAuth: (user: User | null, token?: string | null) => void;
  _hasHydrated: boolean; 
  setHasHydrated: (hydrated: boolean) => void; 
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      _hasHydrated: false, 
      setAuth: (user) => set({
        user,
        isAuthenticated: !!user, // Autentikasi ditentukan dari ada/tidaknya data user
      }),
      setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }), 
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
        }
      },
    },
  ),
);