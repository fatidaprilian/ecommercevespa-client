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
 * Digunakan untuk halaman daftar pengguna dengan pencarian di sisi klien.
 */
export const getUsers = async (): Promise<User[]> => {
  const { data } = await api.get('/users');
  // API sudah mengembalikan array langsung, jadi ini sudah benar.
  return data;
};

/**
 * Mengambil satu pengguna berdasarkan ID.
 * Fungsi ini dibuat lebih efisien dengan memanggil endpoint spesifik.
 */
export const getUserById = async (id: string): Promise<User> => {
  // Langsung panggil API untuk satu user, ini lebih cepat.
  const { data } = await api.get(`/users/${id}`);
  return data;
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

/**
 * Melakukan logout pengguna saat ini dengan meminta server menghapus cookie.
 */
export const logoutUser = async (): Promise<void> => {
  // Kirim request POST ke endpoint logout. Server akan menangani penghapusan cookie.
  await api.post('/auth/logout');
};