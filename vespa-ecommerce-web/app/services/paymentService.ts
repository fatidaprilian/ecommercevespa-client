// file: app/services/paymentService.ts

import api from '@/lib/api';

// Tipe data ini harus cocok dengan yang ada di admin panel
export interface ManualPaymentMethod {
  id: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  logoUrl?: string;
  isActive: boolean;
}

/**
 * Mengambil semua metode pembayaran manual yang AKTIF dari API.
 * Reseller tidak perlu melihat rekening yang sedang non-aktif.
 */
export const getActivePaymentMethods = async (): Promise<ManualPaymentMethod[]> => {
  const { data } = await api.get('/payment-methods'); // Endpoint ini publik dan hanya mengembalikan yang aktif
  return data;
};