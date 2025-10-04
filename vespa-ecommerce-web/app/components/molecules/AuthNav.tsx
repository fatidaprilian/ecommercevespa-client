// app/components/molecules/AuthNav.tsx
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { User, LogOut, UserPlus, Archive, Settings, Heart } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { useWishlistStore } from '@/store/wishlist';
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
  const { user, isAuthenticated, setAuth } = useAuthStore();
  const { fetchCart, clearClientCart } = useCartStore(); // <-- isHydrated tidak perlu diambil di sini
  const { fetchWishlistIds, clearWishlist } = useWishlistStore();

  useEffect(() => {
    const syncUserAndData = async () => {
      if (isAuthenticated) {
        try {
          if (!useAuthStore.getState().user) {
            const profileRes = await api.get('/users/profile');
            const token = useAuthStore.getState().token;
            setAuth(profileRes.data, token);
          }
          // Fetch cart and wishlist in parallel. Logika idempotent sudah ada di dalam store masing-masing.
          await Promise.all([
            fetchCart(),
            fetchWishlistIds()
          ]);
        } catch (error) {
          console.error("Sesi tidak valid, melakukan logout...", error);
          setAuth(null, null);
          clearClientCart();
          clearWishlist();
        }
      }
    };

    syncUserAndData();
    // <-- PERUBAHAN: Cukup jalankan sekali berdasarkan isAuthenticated
  }, [isAuthenticated, setAuth, fetchCart, fetchWishlistIds, clearClientCart, clearWishlist]);

  const handleLogout = () => {
    setAuth(null, null);
    clearClientCart();
    clearWishlist();
  };

  if (isAuthenticated && user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="relative h-8 w-8 rounded-full flex items-center justify-center bg-gray-600 text-white font-bold text-base transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
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
           <DropdownMenuItem asChild>
             <Link href="/profile/akun-saya/wishlist">
               <Heart className="mr-2 h-4 w-4" />
               <span>Wishlist</span>
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

  return (
    <div className="flex items-center space-x-1">
        <Link href="/login" className="flex items-center gap-2 hover:bg-gray-500/10 px-3 py-1.5 rounded-full text-sm font-semibold transition-all">
            <User className="w-4 h-4" />
            Login
        </Link>
        <Link href="/register" className="hidden sm:flex items-center gap-2 bg-[#52616B] text-white hover:bg-[#1E2022] px-3 py-1.5 rounded-full text-sm font-semibold transition-all transform hover:scale-105">
            <UserPlus className="w-4 h-4" />
            Register
        </Link>
    </div>
  );
}