// file: vespa-ecommerce-web/app/services/shippingService.ts

import api from '@/lib/api';
import { ShippingCost } from '@/types/checkout';

// Tipe data ini harus cocok dengan model Prisma Anda
export interface LocationData {
  id: string;
  name: string;
}

export type Province = LocationData;
export type City = LocationData;
export type District = LocationData;

/**
 * Mengambil daftar semua provinsi.
 */
export const getProvinces = async (): Promise<Province[]> => {
  const { data } = await api.get('/shipping/provinces');
  return data;
};

/**
 * Mengambil daftar kota berdasarkan ID provinsi.
 */
export const getCities = async (provinceId: string): Promise<City[]> => {
  const { data } = await api.get(`/shipping/cities?provinceId=${provinceId}`);
  return data;
};

/**
 * Mengambil daftar kecamatan berdasarkan ID kota.
 */
export const getDistricts = async (cityId: string): Promise<District[]> => {
    const { data } = await api.get(`/shipping/districts?cityId=${cityId}`);
    return data;
};

/**
 * Menghitung estimasi ongkos kirim.
 */
export const calculateCost = async (payload: {
  destination: string; // district_id
  weight: number; 
  courier: 'jne' | 'tiki' | 'pos' | 'jnt';
}): Promise<ShippingCost[]> => {
  const { data } = await api.post('/shipping/cost', payload);
  return data;
};