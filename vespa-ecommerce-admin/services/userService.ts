// file: vespa-ecommerce-admin/services/userService.ts

import api from '@/lib/api'; // Assuming your API client is correctly configured

// Keep the Role enum
export enum Role {
  ADMIN = 'ADMIN',
  RESELLER = 'RESELLER',
  MEMBER = 'MEMBER',
}

// Ensure User interface includes isActive
export interface User {
  id: string;
  email: string;
  name: string; // Made non-optional based on previous frontend code
  role: Role;
  createdAt: string; // Added createdAt based on previous frontend code
  accurateCustomerNo?: string | null;
  isActive: boolean; // Make sure this is present
}

// Keep UpdateUserData interface
interface UpdateUserData {
  name?: string; // Made optional as per backend DTO
  role?: Role; // Made optional as per backend DTO
  accurateCustomerNo?: string | null; // Keep null possibility
  isActive?: boolean; // Allow updating isActive via the general update endpoint if needed
}

/**
 * Fetches only ACTIVE users from the backend.
 * Renamed from getUsers for clarity.
 */
export const getActiveUsers = async (): Promise<User[]> => {
  // Calls the default GET /users endpoint which now returns only active users
  const { data } = await api.get('/users');
  return data;
};

/**
 * Fetches only INACTIVE users from the backend.
 * NEW FUNCTION.
 */
export const getInactiveUsers = async (): Promise<User[]> => {
  // Calls the new GET /users/inactive endpoint
  const { data } = await api.get('/users/inactive');
  return data;
};

/**
 * Fetches a single user by ID (can fetch active or inactive).
 * (Original logic unchanged)
 */
export const getUserById = async (id: string): Promise<User> => {
  const { data } = await api.get(`/users/${id}`); //
  return data;
};

/**
 * Updates user data (name, role, accurateCustomerNo, potentially isActive).
 * (Original logic unchanged, UpdateUserData interface adjusted slightly)
 */
export const updateUser = async (id: string, userData: UpdateUserData): Promise<User> => {
  const { data } = await api.patch(`/users/${id}`, userData); //
  return data;
};

/**
 * Updates only the user's role.
 * (Original logic unchanged)
 */
export const updateUserRole = async ({ id, role }: { id: string, role: Role }): Promise<User> => {
  const { data } = await api.patch(`/users/${id}/role`, { role }); //
  return data;
};

/**
 * Sends a request to SOFT DELETE (deactivate) a user.
 * (Original logic unchanged on the frontend side, backend handles the soft delete)
 */
export const deleteUser = async (id: string): Promise<{ message: string }> => { // Return type matches backend response
  // Still calls DELETE /users/:id, backend service now performs soft delete
  const { data } = await api.delete(`/users/${id}`);
  return data; // Return the message from backend
};

/**
 * Toggles the isActive status of a user.
 * NEW FUNCTION.
 */
export const toggleUserActiveStatus = async (id: string): Promise<{ message: string, user: User }> => {
  // Calls the new PATCH /users/:id/toggle-active endpoint
  const { data } = await api.patch(`/users/${id}/toggle-active`);
  return data; // Returns message and updated user data from backend
};


/**
 * Logs out the current user (if applicable, usually handled by clearing tokens).
 * (Original logic unchanged)
 */
export const logoutUser = async (): Promise<void> => {
  // This might just clear local storage/state rather than calling an API endpoint
  // Kept the original API call logic if it exists
  // await api.post('/auth/logout');
  // Usually, you'd clear the token storage here:
  localStorage.removeItem('admin-token'); // Assuming this is where you store it
};