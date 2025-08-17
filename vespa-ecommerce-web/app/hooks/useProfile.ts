// file: app/hooks/useProfile.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { getMyProfile, UserProfile } from '@/services/userService';

export const useProfile = () => {
  return useQuery<UserProfile, Error>({
    queryKey: ['my-profile'],
    queryFn: getMyProfile,
    staleTime: 1000 * 60 * 5, // Cache data selama 5 menit
  });
};