// lib/api.ts

import axios from 'axios';

// 1. Membuat instance axios yang akan digunakan di seluruh aplikasi.
const api = axios.create({
  // Menggunakan environment variable untuk baseURL. Pastikan URL ini
  // menunjuk ke root API Anda, misalnya http://localhost:3001/api/v1
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  
  // 2. ✅ INI KUNCI UTAMANYA:
  //    Mengizinkan browser untuk secara otomatis mengirim cookie (termasuk
  //    cookie httpOnly 'access_token') pada setiap request.
  withCredentials: true,
});

// 3. (Sangat Direkomendasikan) Interceptor untuk menangani error secara global.
//    Ini akan membuat aplikasi lebih ramah pengguna.
api.interceptors.response.use(
  // Jika response sukses, langsung teruskan.
  (response) => response,
  
  // Jika ada error...
  (error) => {
    // Periksa apakah error tersebut adalah 401 Unauthorized.
    if (error.response?.status === 401) {
      
      // Redirect pengguna ke halaman login jika mereka tidak sedang di halaman itu.
      // Ini mencegah aplikasi "macet" di halaman yang butuh otentikasi.
      if (typeof window !== 'undefined' && window.location.pathname !== '/auth/login') {
        window.location.href = '/auth/login';
      }
    }
    
    // Tetap teruskan error agar bisa ditangani lebih lanjut jika perlu.
    return Promise.reject(error);
  }
);

export default api;