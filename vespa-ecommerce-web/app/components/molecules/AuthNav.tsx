// app/components/molecules/AuthNav.tsx
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query'; // <-- TAMBAHAN 1: Import ini
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
  // Ambil _hasHydrated dari store untuk pengecekan
  const { user, isAuthenticated, setAuth, _hasHydrated } = useAuthStore();
  const { fetchCart, clearClientCart } = useCartStore();
  const { fetchWishlistIds, clearWishlist } = useWishlistStore();
  
  // <-- TAMBAHAN 2: Inisialisasi queryClient
  const queryClient = useQueryClient();

  useEffect(() => {
    // Jika state belum selesai dimuat dari localStorage, jangan lakukan apa-apa dulu
    if (!_hasHydrated) {
      return;
    }

    const syncUserAndData = async () => {
      // Hanya jalankan jika state (dari localStorage) bilang user terautentikasi
      if (isAuthenticated) {
        try {
          // Cek apakah data 'user' di state masih kosong, meskipun 'isAuthenticated' true
          const token = useAuthStore.getState().token;
          if (!useAuthStore.getState().user && token) {
              // Panggil API untuk mendapatkan data profil sekaligus memvalidasi token
              const profileRes = await api.get('/users/profile');
              // Jika berhasil, simpan data user ke state ZUSTAND
              setAuth(profileRes.data, token);
          }

          // Setelah memastikan user ada, ambil data keranjang dan wishlist
          await Promise.all([
            fetchCart(),
            fetchWishlistIds()
          ]);

        } catch (error: any) {
          console.error("AuthNav: Gagal sync/fetch profile:", error.message);
          // Jika gagal (misal token expired), bersihkan state
          setAuth(null, null);
          clearClientCart();
          clearWishlist();
        }
      } else {
         // Bersihkan state jika tidak terautentikasi setelah hidrasi
         clearClientCart();
         clearWishlist();
      }
    };

    syncUserAndData();
  }, [isAuthenticated, setAuth, fetchCart, fetchWishlistIds, clearClientCart, clearWishlist, _hasHydrated]);

  const handleLogout = async () => {
    try {
      // Opsional: Panggil endpoint logout di backend jika ada
      // await api.post('/auth/logout');
      
      console.log("AuthNav: Melakukan logout...");
      
      // Bersihkan state auth dan store lokal
      setAuth(null, null);
      clearClientCart();
      clearWishlist();

      // <-- TAMBAHAN 3: Bersihkan semua cache React Query
      // Ini akan memaksa semua komponen (termasuk produk) untuk fetch ulang data segar (harga publik)
      queryClient.clear();

    } catch (error) {
       console.error("AuthNav: Gagal logout:", error);
       // Tetap bersihkan state di frontend meskipun backend gagal
       setAuth(null, null);
       clearClientCart();
       clearWishlist();
       queryClient.clear(); // Tetap clear cache meskipun error
    }
  };

  // Tampilkan placeholder sederhana selama hidrasi (opsional, sesuaikan dengan desain)
  if (!_hasHydrated) {
      return <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>;
  }

  // Tampilkan dropdown jika user sudah login (setelah hidrasi)
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

  // Tampilkan tombol Login/Register jika user tidak login
  return (
    <div className="flex items-center space-x-1">
        <Link
          href="/login"
          className="flex items-center gap-2 bg-[#52616B] text-white hover:bg-[#1E2022] px-3 py-1.5 rounded-full text-sm font-semibold transition-all transform hover:scale-105"
        >
            <User className="w-4 h-4" />
            Masuk
        </Link>
        <Link
          href="/register"
          className="hidden sm:flex items-center gap-2 bg-[#52616B] text-white hover:bg-[#1E2022] px-3 py-1.5 rounded-full text-sm font-semibold transition-all transform hover:scale-105"
        >
            <UserPlus className="w-4 h-4" />
            Daftar
        </Link>
    </div>
  );
}