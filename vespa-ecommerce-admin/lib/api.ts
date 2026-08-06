import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  withCredentials: true, 
});

// Request Interceptor: Token is automatically sent via HttpOnly Cookie
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


/**
 * Response Interceptor: Handles cache busting for Cloudinary image URLs
 * and centralized 401 unauthenticated session expiry handling.
 */
api.interceptors.response.use(
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
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined' && window.location.pathname !== '/auth/login') {
        window.location.href = '/auth/login?session_expired=true';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;