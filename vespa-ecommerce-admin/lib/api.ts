import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, 
});

// Interceptor Request: Token dikirim otomatis via HttpOnly Cookie
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


// 🔥 INTEGRASI INTERCEPTOR RESPONSE: Cache Busting dan Error Handling 🔥
api.interceptors.response.use(
  // ✅ 1. SUCCESS HANDLER: Menambah Timestamp (Cache Busting)
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

    // Terapkan logic cache busting ke data
    if (response.data) {
      response.data = addTimestampToUrls(response.data);
    }
    
    return response; // Lanjutkan respons yang sudah dimodifikasi
  },
  // ✅ 2. ERROR HANDLER: Menangani error 401
  (error) => {
    if (error.response?.status === 401) {
      
      // Redirect ke login jika tidak di halaman login
      if (typeof window !== 'undefined' && window.location.pathname !== '/auth/login') {
        window.location.href = '/auth/login?session_expired=true';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;