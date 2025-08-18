// file: pages/services/paymentMethodService.ts

import api from '@/lib/api';

export interface PaymentMethod {
  id: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  logoUrl?: string;
  isActive: boolean;
}

export type PaymentMethodData = Omit<PaymentMethod, 'id'>;

/**
 * Mengambil semua metode pembayaran (untuk admin).
 */
export const getAllPaymentMethods = async (): Promise<PaymentMethod[]> => {
  const { data } = await api.get('/payment-methods/all');
  return data;
};

/**
 * Membuat metode pembayaran baru.
 */
export const createPaymentMethod = async (
  methodData: PaymentMethodData
): Promise<PaymentMethod> => {
  const { data } = await api.post('/payment-methods', methodData);
  return data;
};

/**
 * Memperbarui metode pembayaran.
 */
export const updatePaymentMethod = async (
  id: string,
  methodData: Partial<PaymentMethodData>
): Promise<PaymentMethod> => {
  const { data } = await api.patch(`/payment-methods/${id}`, methodData);
  return data;
};

/**
 * Menghapus metode pembayaran.
 */
export const deletePaymentMethod = async (id: string): Promise<void> => {
  await api.delete(`/payment-methods/${id}`);
};