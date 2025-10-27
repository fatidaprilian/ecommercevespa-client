import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  withCredentials: false, 
});

api.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin-token') : null;

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


api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log("Admin Axios Response Interceptor: Menangkap error:", error.response?.status, error.config?.url);
    if (error.response?.status === 401) {
      console.warn("Admin Axios Response Interceptor: Menerima status 401.");
      if (typeof window !== 'undefined') localStorage.removeItem('admin-token');

      if (typeof window !== 'undefined' && window.location.pathname !== '/auth/login') {
        console.log("Admin Axios Response Interceptor: Redirect ke login...");
        window.location.href = '/auth/login?session_expired=true';
      } else {
         console.log("Admin Axios Response Interceptor: Sudah di halaman login.");
      }
    }
    return Promise.reject(error);
  }
);

export default api;