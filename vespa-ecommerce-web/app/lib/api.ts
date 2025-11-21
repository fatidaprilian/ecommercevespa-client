// app/lib/api.ts
import axios from 'axios';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { useWishlistStore } from '@/store/wishlist';

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

// Interceptor Response: Menambah Timestamp (Cache Busting) & Menangani error 401
api.interceptors.response.use(
  // ✅ 1. SUCCESS HANDLER: Menambah Timestamp (Cache Busting)
  (response) => {
    // Fungsi rekursif untuk tambah timestamp ke semua URL Cloudinary
    const addTimestampToUrls = (obj: any): any => {
      if (!obj) return obj;

      // Kalau string dan mengandung URL Cloudinary
      if (typeof obj === 'string' && obj.includes('res.cloudinary.com')) {
        // Cek apakah sudah ada ?v= atau tidak
        if (!obj.includes('?v=')) {
          const separator = obj.includes('?') ? '&' : '?';
          return `${obj}${separator}v=${Date.now()}`;
        }
        return obj;
      }

      // Kalau array, proses elemennya
      if (Array.isArray(obj)) {
        return obj.map(item => addTimestampToUrls(item));
      }

      // Kalau object, proses propertinya secara rekursif
      if (typeof obj === 'object') {
        const newObj: any = {};
        for (const key in obj) {
          if (obj[key] !== null) {
              newObj[key] = addTimestampToUrls(obj[key]);
          } else {
              newObj[key] = null;
          }
        }
        return newObj;
      }

      return obj;
    };

    // Terapkan logic cache busting
    if (response.data) {
      response.data = addTimestampToUrls(response.data);
    }
    
    return response;
  },
  // ✅ 2. ERROR HANDLER: Menangani error 401
  (error) => {
    console.log("Axios Response Interceptor: Menangkap error:", error.response?.status, error.config?.url);

    // Periksa apakah error adalah 401 Unauthorized
    if (error.response && error.response.status === 401) {
      console.warn("Axios Response Interceptor: Menerima status 401 (Unauthorized).");

      const { setAuth } = useAuthStore.getState();
      const { clearClientCart } = useCartStore.getState();
      const { clearWishlist } = useWishlistStore.getState();

      // Cek apakah kita *tidak* sedang di halaman login, untuk mencegah loop redirect
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        
        console.log("Axios Response Interceptor: Bukan di halaman login. Melakukan logout dan redirect...");

        setAuth(null, null); // Langsung set state ke logged out
        clearClientCart();   // Bersihkan keranjang
        clearWishlist();     // Bersihkan wishlist

        // Redirect paksa ke halaman login dengan parameter
        window.location.href = '/login?session_expired=true';
      } else {
        console.log("Axios Response Interceptor: Sudah di halaman login atau environment bukan browser. Tidak redirect.");
      }
    } else {
      console.log("Axios Response Interceptor: Error bukan 401 atau tidak ada response.");
    }
    
    // Teruskan error
    return Promise.reject(error);
  }
);

export default api;