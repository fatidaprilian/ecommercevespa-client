import axios from 'axios';
// Asumsi: Admin panel punya store serupa untuk menyimpan token
// import { useAuthStore } from '@/store/auth'; // Sesuaikan path jika berbeda

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  // --- 👇 HAPUS ATAU UBAH MENJADI FALSE ---
  withCredentials: false, 
});

// --- 👇 TAMBAHKAN INTERCEPTOR REQUEST INI ---
api.interceptors.request.use(
  (config) => {
    // Asumsi: Ambil token dari localStorage via store
    // const token = useAuthStore.getState().token; // Sesuaikan jika nama store berbeda
    // Cara alternatif jika tidak pakai Zustand:
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin-token') : null; // Ganti 'admin-token' jika key-nya berbeda

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log("Admin Axios Request Interceptor: Menambahkan token ke header.");
    } else {
      console.log("Admin Axios Request Interceptor: Tidak ada token.");
    }
    return config;
  },
  (error) => {
    console.error("Admin Axios Request Interceptor Error:", error);
    return Promise.reject(error);
  }
);
// --- SELESAI PENAMBAHAN INTERCEPTOR REQUEST ---


// Interceptor response untuk redirect 401 (ini sudah ada dan benar)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log("Admin Axios Response Interceptor: Menangkap error:", error.response?.status, error.config?.url);
    if (error.response?.status === 401) {
      console.warn("Admin Axios Response Interceptor: Menerima status 401.");
      // Lakukan logout jika ada store
      // useAuthStore.getState().logout(); // Sesuaikan jika nama fungsi/store berbeda
      // Hapus token manual jika tidak pakai store
      if (typeof window !== 'undefined') localStorage.removeItem('admin-token'); // Ganti 'admin-token' jika key-nya berbeda

      if (typeof window !== 'undefined' && window.location.pathname !== '/auth/login') {
        console.log("Admin Axios Response Interceptor: Redirect ke login...");
        window.location.href = '/auth/login?session_expired=true'; // Arahkan ke login admin
      } else {
         console.log("Admin Axios Response Interceptor: Sudah di halaman login.");
      }
    }
    return Promise.reject(error);
  }
);

export default api;