// src/hooks/use-test-api.ts

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api'; // Impor instance axios kita

// Fungsi untuk mengambil data
const getHelloWorld = async () => {
  // Kita memanggil endpoint root dari API kita
  const { data } = await api.get('/'); 
  return data;
};

export const useTestApi = () => {
  return useQuery({
    // 'queryKey' adalah kunci unik untuk query ini
    queryKey: ['hello-world'],
    // 'queryFn' adalah fungsi yang akan dijalankan untuk mengambil data
    queryFn: getHelloWorld,
  });
};