// vespa-ecommerce-admin/pages/lib/api.ts
import axios from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
  // Menggunakan environment variable untuk baseURL
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // Mengizinkan pengiriman cookie
});

// Interceptor untuk menambahkan token dari cookie ke setiap request
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
