// file: pages/services/shippingService.ts

import api from '@/lib/api';

// Tipe data ini digunakan bersama di beberapa tempat
export interface LocationData {
  id: string;
  name: string;
}

/**
 * Mengambil daftar semua provinsi dari backend.
 */
export const getProvinces = async (): Promise<LocationData[]> => {
  const { data } = await api.get('/shipping/provinces');
  return data;
};

/**
 * Mengambil daftar kota berdasarkan ID provinsi.
 */
export const getCities = async (provinceId: string): Promise<LocationData[]> => {
  const { data } = await api.get(`/shipping/cities?provinceId=${provinceId}`);
  return data;
};

/**
 * Mengambil daftar kecamatan berdasarkan ID kota.
 */
export const getDistricts = async (cityId: string): Promise<LocationData[]> => {
  const { data } = await api.get(`/shipping/districts?cityId=${cityId}`);
  return data;
};