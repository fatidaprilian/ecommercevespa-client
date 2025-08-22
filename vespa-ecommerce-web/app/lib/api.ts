import axios from 'axios';
import { useAuthStore } from '@/store/auth'; // Impor store

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  // withCredentials: true, // Ini untuk cookie, kita tidak pakai
});

// Ini adalah interceptor yang akan menambahkan token ke setiap request
api.interceptors.request.use(
  (config) => {
    // Ambil token dari Zustand store
    const token = useAuthStore.getState().token;
    if (token) {
      // Jika token ada, tambahkan ke header
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;