// app/lib/api.ts
import axios from 'axios';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { useWishlistStore } from '@/store/wishlist';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  withCredentials: true,
});

// Interceptor Request: Tidak perlu lagi menambah Authorization header secara manual, 
// karena token sudah otomatis dikirim lewat cookie berkat withCredentials: true
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor Response: Menambah Timestamp (Cache Busting) & Menangani error 401
api.interceptors.response.use(
  // 1. SUCCESS HANDLER: Menambah Timestamp (Cache Busting)
  (response) => {
    const imageKeys = ['imageUrl', 'url', 'logoUrl', 'proofOfPayment', 'bannerImageUrl', 'images'];
    const addTimestampToUrls = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return obj;

      if (Array.isArray(obj)) {
        return obj.map(item => addTimestampToUrls(item));
      }

      const newObj: any = {};
      for (const key in obj) {
        const val = obj[key];
        if (val && typeof val === 'string' && imageKeys.includes(key) && val.includes('res.cloudinary.com')) {
          const separator = val.includes('?') ? '&' : '?';
          newObj[key] = val.includes('?v=') ? val : `${val}${separator}v=${Date.now()}`;
        } else if (val && typeof val === 'object') {
          newObj[key] = addTimestampToUrls(val);
        } else {
          newObj[key] = val;
        }
      }
      return newObj;
    };

    if (response.data) {
      response.data = addTimestampToUrls(response.data);
    }
    
    return response;
  },
  // 2. ERROR HANDLER: Menangani error 401
  (error) => {
    if (error.response && error.response.status === 401) {
      const { isAuthenticated, setAuth } = useAuthStore.getState();
      const { clearClientCart } = useCartStore.getState();
      const { clearWishlist } = useWishlistStore.getState();

      // Hanya redirect ke login jika user SEBELUMNYA sudah login (session expired).
      // Jangan redirect jika user memang belum login (guest browsing).
      if (isAuthenticated && typeof window !== 'undefined' && window.location.pathname !== '/login') {
        setAuth(null); 
        clearClientCart();   
        clearWishlist();     
        window.location.href = '/login?session_expired=true';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;