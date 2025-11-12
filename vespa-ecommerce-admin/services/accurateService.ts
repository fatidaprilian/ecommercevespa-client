// File: pages/services/accurateService.ts

import api from '@/lib/api';

export interface AccurateStatus {
  connected: boolean;
  dbSelected: boolean;
}

export interface AccurateBankAccount {
  id: number;
  no: string; 
  name: string;
  accountType: string;
}

// 👇👇 TAMBAHKAN INTERFACE BARU INI 👇👇
export interface PriceCategory {
  id: number;
  name: string;
  isDefault: boolean;
}
// 👆👆 AKHIR TAMBAHAN 👆👆

export const getAccurateStatus = async (): Promise<AccurateStatus> => {
  const { data } = await api.get('/accurate/status');
  return data;
};

export const getAccurateAuthUrl = async (): Promise<{ url: string }> => {
  const { data } = await api.get('/accurate/authorize-url');
  return data;
}

export const disconnectAccurate = async (): Promise<{ message: string }> => {
    const { data } = await api.delete('/accurate/disconnect');
    return data;
}

export const getAccurateBankAccounts = async (): Promise<AccurateBankAccount[]> => {
  const { data } = await api.get('/accurate/bank-accounts');
  return data;
};

// 👇👇 TAMBAHKAN FUNCTION BARU INI 👇👇
export const getPriceCategories = async (): Promise<PriceCategory[]> => {
  const { data } = await api.get('/accurate-pricing/categories');
  return data;
};
// 👆👆 AKHIR TAMBAHAN 👆👆