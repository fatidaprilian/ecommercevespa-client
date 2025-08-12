// src/providers/dataProvider.ts

import axios from "axios";
import type { DataProvider } from "@refinedev/core";

// Ambil base URL dari environment variable
const API_URL = import.meta.env.VITE_API_URL;

// Buat instance axios yang akan selalu mengirim cookie
const axiosInstance = axios.create({
  withCredentials: true,
  baseURL: API_URL,
});

// Handle jika ada error dari API
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const customError = {
      ...error,
      message: error.response?.data?.message,
      statusCode: error.response?.status,
    };

    return Promise.reject(customError);
  }
);


export const dataProvider: DataProvider = {
  getList: async ({ resource, pagination, sorters, filters }) => {
    const url = `${API_URL}/${resource}`;

    // NOTE: Backend Anda belum mendukung pagination, sorters, filters.
    // Ini adalah implementasi dasar.
    const { data } = await axiosInstance.get(url);

    return {
      // NestJS findAll() mengembalikan array langsung
      data: data,
      // Karena tidak ada pagination, totalnya adalah panjang array
      total: data.length,
    };
  },

  getOne: async ({ resource, id }) => {
    const url = `${API_URL}/${resource}/${id}`;
    const { data } = await axiosInstance.get(url);

    return {
      data,
    };
  },

  create: async ({ resource, variables }) => {
    const url = `${API_URL}/${resource}`;
    const { data } = await axiosInstance.post(url, variables);

    return {
      data,
    };
  },

  update: async ({ resource, id, variables }) => {
    const url = `${API_URL}/${resource}/${id}`;
    const { data } = await axiosInstance.patch(url, variables);

    return {
      data,
    };
  },

  deleteOne: async ({ resource, id, variables }) => {
    const url = `${API_URL}/${resource}/${id}`;
    const { data } = await axiosInstance.delete(url, {
      data: variables,
    });

    return {
      data,
    };
  },

  getApiUrl: () => {
    return API_URL;
  },

  // Fungsi lain yang dibutuhkan Refine, bisa dikosongkan untuk saat ini
  getMany: async () => { throw new Error("Not implemented"); },
  createMany: async () => { throw new Error("Not implemented"); },
  deleteMany: async () => { throw new Error("Not implemented"); },
  updateMany: async () => { throw new Error("Not implemented"); },
  custom: async () => { throw new Error("Not implemented"); },
};