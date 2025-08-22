// file: vespa-ecommerce-admin/services/settingsService.ts

import api from '@/lib/api';

// Tipe data untuk satu item pengaturan
export interface AppSetting {
  key: string;
  value: string;
  description?: string;
}

// Tipe data untuk payload batch update
export interface SettingPayload {
    key: string;
    value: string;
}

/**
 * Mengambil semua pengaturan dari API.
 */
export const getAllSettings = async (): Promise<AppSetting[]> => {
  const { data } = await api.get('/settings');
  return data;
};

/**
 * Mengambil satu pengaturan berdasarkan kuncinya.
 */
export const getSetting = async (key: string): Promise<AppSetting> => {
  const { data } = await api.get(`/settings/${key}`);
  return data;
};

/**
 * Memperbarui atau membuat sebuah pengaturan.
 */
export const updateSetting = async ({ key, value, description }: { key: string; value: string; description?: string }): Promise<AppSetting> => {
  const { data } = await api.put(`/settings/${key}`, { value, description });
  return data;
};

/**
 * Memperbarui beberapa pengaturan sekaligus.
 * @param settings - Array berisi objek pengaturan { key, value }.
 */
export const updateMultipleSettings = async (settings: SettingPayload[]): Promise<AppSetting[]> => {
    const { data } = await api.post('/settings/batch-update', { settings });
    return data;
};


// ======================================================
// FUNGSI BARU KHUSUS UNTUK PENGATURAN PPN (VAT)
// ======================================================

/**
 * Mengambil pengaturan PPN secara spesifik.
 * @returns {Promise<{ key: string; value: number }>} Objek berisi kunci dan nilai PPN.
 */
export const getVatSetting = async (): Promise<{ key: string; value: number }> => {
  const { data } = await api.get('/settings/ppn');
  return data;
};

/**
 * Memperbarui pengaturan PPN.
 * @param {number} value - Nilai persentase PPN yang baru.
 */
export const updateVatSetting = async (value: number): Promise<AppSetting> => {
  const { data } = await api.patch('/settings/ppn', { value });
  return data;
};