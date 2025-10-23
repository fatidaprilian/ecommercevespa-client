// app/components/molecules/AuthNav.tsx
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
// Impor ikon yang mungkin diperlukan (pastikan Loader2 ada jika ingin menampilkan loading)
import { User, LogOut, UserPlus, Archive, Settings, Heart, Loader2 } from 'lucide-react';
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
  // --- 👇 AMBIL _hasHydrated DARI STORE ---
  // Kita tambahkan _hasHydrated di sini
  const { user, isAuthenticated, setAuth, _hasHydrated } = useAuthStore();
  const { fetchCart, clearClientCart } = useCartStore();
  const { fetchWishlistIds, clearWishlist } = useWishlistStore();

  useEffect(() => {
    // --- 👇 TAMBAHKAN PENGECEKAN HIDRASI DI AWAL ---
    // Jika state belum selesai dimuat dari localStorage, jangan lakukan apa-apa dulu
    if (!_hasHydrated) {
      console.log("AuthNav: Menunggu hidrasi Zustand..."); // Pesan log untuk debugging
      return; // Keluar dari useEffect lebih awal
    }
    // ---------------------------------------------

    // Log ini akan muncul setelah hidrasi selesai
    console.log("AuthNav: State terhidrasi. Memeriksa status autentikasi...");

    const syncUserAndData = async () => {
      // Hanya jalankan jika state (dari localStorage) bilang user terautentikasi
      if (isAuthenticated) {
        console.log("AuthNav: Terautentikasi (berdasarkan state). Memvalidasi sesi ke backend...");
        try {
          // --- 👇 PERBAIKI LOGIKA FETCH PROFILE ---
          // Cek apakah data 'user' di state masih kosong, meskipun 'isAuthenticated' true
          const token = useAuthStore.getState().token; // Ambil token saat ini
          if (!useAuthStore.getState().user && token) {
              console.log("AuthNav: User belum ada di state, mencoba fetch profile...");
              // Panggil API untuk mendapatkan data profil, ini sekaligus memvalidasi token
              const profileRes = await api.get('/users/profile');
              console.log("AuthNav: Profile berhasil di-fetch.");
              // Jika berhasil, simpan data user ke state ZUSTAND
              setAuth(profileRes.data, token); // Simpan user & token yang masih valid
          } else if (useAuthStore.getState().user) {
              // Jika data user sudah ada di state, tidak perlu fetch ulang
              console.log("AuthNav: User sudah ada di state.");
          }
          // -------------------------------------

          // Setelah memastikan user ada (baik dari state atau hasil fetch),
          // baru ambil data keranjang dan wishlist
          console.log("AuthNav: Fetching cart dan wishlist...");
          await Promise.all([
            fetchCart(),       // Fungsi ini sudah punya pengecekan hidrasi internal
            fetchWishlistIds() // Pastikan fungsi ini juga aman jika dipanggil sebelum hidrasi (atau andalkan AuthNav)
          ]);
          console.log("AuthNav: Cart dan wishlist selesai di-fetch.");

        } catch (error: any) {
          // Jika fetch profile gagal (error 401), berarti token tidak valid/kedaluwarsa
          console.error("AuthNav: Gagal sync/fetch profile (kemungkinan token kedaluwarsa):", error.response?.data || error.message);
          // Interceptor Axios di api.ts *seharusnya* menangani error 401 dan redirect,
          // tapi ini sebagai langkah pengaman tambahan untuk membersihkan state.
          setAuth(null, null);      // Hapus user dan token dari state
          clearClientCart();        // Bersihkan data keranjang di client
          clearWishlist();          // Bersihkan data wishlist di client
        }
      } else {
         // --- 👇 BERSIHKAN STATE JIKA TIDAK LOGIN ---
         // Jika setelah hidrasi ternyata user tidak terautentikasi
         console.log("AuthNav: Tidak terautentikasi. Membersihkan cart/wishlist client.");
         clearClientCart();
         clearWishlist();
         // ----------------------------------------
      }
    };

    syncUserAndData(); // Jalankan fungsi validasi
    // --- 👇 TAMBAHKAN _hasHydrated SEBAGAI DEPENDENCY ---
    // useEffect ini akan dijalankan lagi jika salah satu nilai ini berubah
  }, [isAuthenticated, setAuth, fetchCart, fetchWishlistIds, clearClientCart, clearWishlist, _hasHydrated]);

  // Fungsi logout tidak berubah signifikan, tapi bisa dibuat async jika memanggil API
  const handleLogout = async () => {
    try {
      // Opsional: Panggil endpoint logout di backend jika ada
      // await api.post('/auth/logout');
      console.log("AuthNav: Melakukan logout...");
      setAuth(null, null);
      clearClientCart();
      clearWishlist();
      // Opsional: Redirect ke halaman login setelah logout
      // window.location.href = '/login';
    } catch (error) {
       console.error("AuthNav: Gagal logout:", error);
       // Tetap bersihkan state di frontend meskipun backend gagal
       setAuth(null, null);
       clearClientCart();
       clearWishlist();
    }
  };

  // --- 👇 TAMPILKAN PLACEHOLDER SELAMA HIDRASI (OPSIONAL) ---
  // Selama state belum siap (_hasHydrated false), tampilkan UI loading sederhana
  if (!_hasHydrated) {
      // Ganti ini dengan komponen Skeleton jika Anda punya
      return <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>;
      // Atau bisa juga: return null; jika tidak ingin menampilkan apa-apa
  }
  // --------------------------------------------------------


  // Tampilkan dropdown jika user sudah login (setelah hidrasi)
  if (isAuthenticated && user) {
    // ... (Kode JSX untuk Dropdown menu tidak berubah) ...
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

  // Tampilkan tombol Login/Register jika sudah terhidrasi dan user tidak login
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