// app/lib/api.ts
import axios from 'axios';
import { useAuthStore } from '@/store/auth';
// --- 👇 TAMBAHKAN DUA BARIS IMPOR INI ---
import { useCartStore } from '@/store/cart';
import { useWishlistStore } from '@/store/wishlist';
// -------------------------------------

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  // Kita set 'false' untuk memastikan kita tidak bergantung pada cookie
  withCredentials: false,
});

// Interceptor Request: Menambahkan token ke header
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log("Axios Request Interceptor: Menambahkan token ke header.");
    } else {
      console.log("Axios Request Interceptor: Tidak ada token.");
    }
    return config;
  },
  (error) => {
    console.error("Axios Request Interceptor Error:", error);
    return Promise.reject(error);
  }
);

// Interceptor Response: Menangani error 401
api.interceptors.response.use(
  // Biarkan respons sukses lolos
  (response) => response,
  // Tangani jika ada error pada respons
  (error) => {
    console.log("Axios Response Interceptor: Menangkap error:", error.response?.status, error.config?.url); // line 36 (sudah muncul)

    // Periksa apakah error adalah 401 Unauthorized
    if (error.response && error.response.status === 401) {
      console.warn("Axios Response Interceptor: Menerima status 401 (Unauthorized)."); // line 40 (sudah muncul)

      // --- 👇 KODE INI SEBELUMNYA GAGAL KARENA IMPORT KURANG ---
      const { setAuth } = useAuthStore.getState();
      const { clearClientCart } = useCartStore.getState(); // <-- Ini butuh useCartStore
      const { clearWishlist } = useWishlistStore.getState(); // <-- Ini butuh useWishlistStore

      // Cek apakah kita *tidak* sedang di halaman login, untuk mencegah loop redirect
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        
        // Log ini SEHARUSNYA MUNCUL SEKARANG:
        console.log("Axios Response Interceptor: Bukan di halaman login. Melakukan logout dan redirect...");

        // Panggil fungsi logout (atau setAuth langsung)
        setAuth(null, null); // Langsung set state ke logged out
        clearClientCart();   // Bersihkan keranjang
        clearWishlist();     // Bersihkan wishlist

        // Redirect paksa ke halaman login dengan parameter
        window.location.href = '/login?session_expired=true';
      } else {
        console.log("Axios Response Interceptor: Sudah di halaman login atau environment bukan browser. Tidak redirect.");
      }
      // --------------------------------------------------------

    } else {
      console.log("Axios Response Interceptor: Error bukan 401 atau tidak ada response.");
    }
    
    // Teruskan error agar bisa ditangani lebih lanjut jika perlu (misalnya oleh React Query)
    return Promise.reject(error);
  }
);

export default api;