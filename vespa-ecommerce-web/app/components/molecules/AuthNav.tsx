// file: vespa-ecommerce-web/app/components/molecules/AuthNav.tsx
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { User, LogOut, UserPlus } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart'; // <-- 1. IMPORT CART STORE
import api from '@/lib/api';

export default function AuthNav() {
  const { user, isAuthenticated, setAuth } = useAuthStore();
  // --- 2. AMBIL AKSI DARI CART STORE ---
  const { fetchCart, clearClientCart } = useCartStore();

  useEffect(() => {
    const syncUserAndCart = async () => {
      if (isAuthenticated && !user) {
        try {
          // Ambil profil user
          const { data } = await api.get('/users/profile');
          const token = useAuthStore.getState().token;
          setAuth(data, token);

          // --- 3. AMBIL DATA KERANJANG SETELAH USER ADA ---
          await fetchCart();

        } catch (error) {
          console.error("Sesi tidak valid, logout.", error);
          setAuth(null, null);
          clearClientCart(); // Bersihkan juga data keranjang
        }
      } else if (isAuthenticated && user) {
        // Jika user sudah ada (misal dari login langsung), cukup fetch cart
        fetchCart();
      }
    };
    syncUserAndCart();
  }, [isAuthenticated, user, setAuth, fetchCart, clearClientCart]);

  const handleLogout = () => {
    setAuth(null, null);
    // --- 4. BERSIHKAN KERANJANG SAAT LOGOUT ---
    clearClientCart();
  };

  // ... (Bagian JSX tidak ada perubahan, tetap sama)
  if (isAuthenticated && user) {
    return (
      <div className="flex items-center space-x-4">
        <span className="hidden sm:inline font-semibold">Halo, {user.name}!</span>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full text-sm font-semibold transition-all transform hover:scale-105"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-center space-x-2">
      <Link href="/login" className="flex items-center gap-2 hover:bg-gray-500/10 px-4 py-2 rounded-full text-sm font-semibold transition-all">
        <User className="w-4 h-4" />
        Login
      </Link>
      <Link href="/register" className="hidden sm:flex items-center gap-2 bg-[#52616B] text-white hover:bg-[#1E2022] px-4 py-2 rounded-full text-sm font-semibold transition-all transform hover:scale-105">
        <UserPlus className="w-4 h-4" />
        Register
      </Link>
    </div>
  );
}