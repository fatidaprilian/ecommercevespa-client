// file: app/components/molecules/AuthNav.tsx
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { User, LogOut, UserPlus, Archive, Settings } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import api from '@/lib/api';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AuthNav() {
  // --- PERBAIKAN DI SINI: Destructure user secara terpisah ---
  const { user, isAuthenticated, setAuth } = useAuthStore();
  const { fetchCart, clearClientCart } = useCartStore();

  // --- PERBAIKAN UTAMA PADA useEffect ---
  useEffect(() => {
    const syncUserAndCart = async () => {
      // Hanya jalankan jika user terautentikasi
      if (isAuthenticated) {
        try {
          // Ambil user profile jika belum ada di state
          if (!useAuthStore.getState().user) {
            const profileRes = await api.get('/users/profile');
            const token = useAuthStore.getState().token;
            setAuth(profileRes.data, token);
          }
          // Muat data keranjang
          await fetchCart();
        } catch (error) {
          console.error("Sesi tidak valid, melakukan logout...", error);
          setAuth(null, null);
          clearClientCart();
        }
      }
    };

    syncUserAndCart();
    // Dependensi diubah agar tidak memantau 'user', sehingga tidak menyebabkan loop
  }, [isAuthenticated, setAuth, fetchCart, clearClientCart]);

  const handleLogout = () => {
    setAuth(null, null);
    clearClientCart();
  };

  if (isAuthenticated && user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="relative h-10 w-10 rounded-full flex items-center justify-center bg-gray-600 text-white font-bold text-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
            {user.name?.charAt(0).toUpperCase()}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
             <Link href="/profile/akun-saya">
                <Settings className="mr-2 h-4 w-4" />
                <span>Akun Saya</span>
            </Link>
          </DropdownMenuItem>
           <DropdownMenuItem asChild>
             <Link href="/orders">
                <Archive className="mr-2 h-4 w-4" />
                <span>Pesanan Saya</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 focus:bg-red-50">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Tampilan saat pengguna belum login
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