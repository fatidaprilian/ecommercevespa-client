// file: app/services/orderService.ts

import api from '@/lib/api';
import { Order } from '@/types';

/**
 * Mengambil satu data pesanan berdasarkan ID-nya.
 * Fungsi ini digunakan di sisi pelanggan/web utama.
 */
export const getOrderById = async (orderId: string): Promise<Order> => {
  if (!orderId) {
    throw new Error('Order ID is required');
  }
  const { data } = await api.get(`/orders/${orderId}`);
  return data;
};