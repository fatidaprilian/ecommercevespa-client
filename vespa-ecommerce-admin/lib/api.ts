import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  withCredentials: false, 
});

// Interceptor Request: Menambahkan token ke header
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


// 🔥 INTEGRASI INTERCEPTOR RESPONSE: Cache Busting dan Error Handling 🔥
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

    // Terapkan logic cache busting ke data
    if (response.data) {
      response.data = addTimestampToUrls(response.data);
    }
    
    return response; // Lanjutkan respons yang sudah dimodifikasi
  },
  // ✅ 2. ERROR HANDLER: Menangani error 401
  (error) => {
    console.log("Admin Axios Response Interceptor: Menangkap error:", error.response?.status, error.config?.url);
    
    if (error.response?.status === 401) {
      console.warn("Admin Axios Response Interceptor: Menerima status 401.");
      
      // Hapus token
      if (typeof window !== 'undefined') localStorage.removeItem('admin-token');

      // Redirect ke login jika tidak di halaman login
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