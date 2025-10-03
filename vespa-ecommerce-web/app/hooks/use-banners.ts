// app/hooks/use-banners.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl?: string;
  type: 'HERO' | 'MIDDLE';
  isActive: boolean;
}

const getActiveBanners = async (): Promise<Banner[]> => {
  const { data } = await api.get('/homepage-banners/active');
  return data;
};

export const useBanners = () => {
  return useQuery<Banner[], Error>({
    queryKey: ['activeBanners'],
    queryFn: getActiveBanners,
    staleTime: 1000 * 60 * 5, // Cache selama 5 menit
  });
};