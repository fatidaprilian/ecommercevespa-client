// file: app/services/userService.ts
import api from '@/lib/api';
import { User } from '@/types';

export interface UserProfile extends User {
  createdAt: string;
  updatedAt: string;
}

export const getMyProfile = async (): Promise<UserProfile> => {
  const { data } = await api.get('/users/profile');
  return data;
};

// ✅ FUNGSI BARU UNTUK UPDATE PROFIL
export const updateMyProfile = async (payload: { name: string }): Promise<UserProfile> => {
    const { data } = await api.patch('/users/profile', payload);
    return data;
}