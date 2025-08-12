// src/authProvider.ts

import type { AuthProvider } from "@refinedev/core";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

// Gunakan instance axios yang sama dengan dataProvider
const axiosInstance = axios.create({
  withCredentials: true,
  baseURL: API_URL,
});

export const authProvider: AuthProvider = {
  // Fungsi login akan memanggil endpoint /auth/login
  login: async ({ email, password }) => {
    try {
      // Backend akan men-set httpOnly cookie saat login berhasil
      await axiosInstance.post("/auth/login", { email, password });
      
      return {
        success: true,
        redirectTo: "/",
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          name: "LoginError",
          message: error?.response?.data?.message || "Invalid credentials",
        },
      };
    }
  },

  logout: async () => {
    // Kita tidak punya endpoint logout, jadi cukup redirect ke login.
    // Cookie akan expired dengan sendirinya.
    return {
      success: true,
      redirectTo: "/login",
    };
  },

  // check akan memanggil endpoint profile yang terproteksi
  check: async () => {
    try {
      // Jika request ini berhasil, berarti cookie valid
      await axiosInstance.get("/auth/profile");
      return {
        authenticated: true,
      };
    } catch (error) {
      return {
        authenticated: false,
        redirectTo: "/login",
      };
    }
  },

  getPermissions: async () => null,

  // getIdentity akan mengambil data user dari endpoint profile
  getIdentity: async () => {
    try {
      const { data } = await axiosInstance.get("/auth/profile");
      if (data) {
        return data; // Backend mengembalikan data user
      }
    } catch (error) {
      return null;
    }
    return null;
  },

  onError: async (error) => {
    if (error.response?.status === 401) {
      return {
        logout: true,
      };
    }
    return { error };
  },
};