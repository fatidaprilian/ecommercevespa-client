// file: pages/services/userService.ts
import api from '@/lib/api';

export enum Role {
  ADMIN = 'ADMIN',
  RESELLER = 'RESELLER',
  MEMBER = 'MEMBER',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

/**
 * Mengambil semua data pengguna.
 */
export const getUsers = async (): Promise<User[]> => {
  const { data } = await api.get('/users');
  return data;
};

/**
 * Mengambil satu pengguna berdasarkan ID.
 */
export const getUserById = async (id: string): Promise<User> => {
  // Untuk client-side filtering, kita bisa ambil semua dan cari.
  // Ini efisien jika jumlah user tidak terlalu besar.
  const users = await getUsers();
  const user = users.find(u => u.id === id);
  if (!user) throw new Error("User not found");
  return user;
};

/**
 * Memperbarui peran (role) seorang pengguna.
 */
export const updateUserRole = async ({ id, role }: { id: string, role: Role }): Promise<User> => {
  const { data } = await api.patch(`/users/${id}/role`, { role });
  return data;
};

/**
 * Menghapus seorang pengguna.
 */
export const deleteUser = async (id: string): Promise<void> => {
  await api.delete(`/users/${id}`);
};