import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  
  (error) => {
    if (error.response?.status === 401) {
      
      if (typeof window !== 'undefined' && window.location.pathname !== '/auth/login') {
        window.location.href = '/auth/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;