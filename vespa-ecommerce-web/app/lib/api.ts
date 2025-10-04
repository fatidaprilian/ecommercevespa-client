import axios from 'axios';
import { useAuthStore } from '@/store/auth';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL, // <-- Menggunakan variabel Anda yang benar
});

// Interceptor untuk menambahkan token ke setiap request (ini sudah ada)
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// BARU: Interceptor untuk menangani session yang sudah habis (401 Error)
api.interceptors.response.use(
  // Biarkan response sukses lewat begitu saja
  (response) => response,
  // Tangani jika ada error pada response
  (error) => {
    // Periksa apakah error disebabkan oleh session tidak valid (status 401)
    if (error.response && error.response.status === 401) {
      const { logout } = useAuthStore.getState();
      
      // Jangan jalankan logout jika error 401 terjadi di halaman login itu sendiri
      // untuk menghindari redirect loop
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        logout();
        // Arahkan ke halaman login untuk memberitahu pengguna
        window.location.href = '/login?session_expired=true';
      }
    }
    // Teruskan error agar bisa ditangani oleh bagian lain jika perlu
    return Promise.reject(error);
  }
);

export default api;