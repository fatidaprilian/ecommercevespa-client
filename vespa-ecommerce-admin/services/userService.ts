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

export const getUsers = async (): Promise<User[]> => {
  const { data } = await api.get('/users');
  return data;
};

export const getUserById = async (id: string): Promise<User> => {
  const { data } = await api.get(`/users/${id}`);
  return data;
};

export const updateUserRole = async ({ id, role }: { id: string, role: Role }): Promise<User> => {
  const { data } = await api.patch(`/users/${id}/role`, { role });
  return data;
};

export const deleteUser = async (id: string): Promise<void> => {
  await api.delete(`/users/${id}`);
};

export const logoutUser = async (): Promise<void> => {
  await api.post('/auth/logout');
};