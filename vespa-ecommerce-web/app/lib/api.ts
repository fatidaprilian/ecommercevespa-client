import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  // Tambahkan baris ini
  withCredentials: true, 
});

// Kita TIDAK PERLU interceptor untuk menambahkan token lagi,
// karena browser akan menanganinya secara otomatis.

export default api;