// file: app/services/orderService.ts

import api from '@/lib/api';
import { Order } from '@/types';

// Tambahkan tipe data untuk respons paginasi
export interface PaginatedOrders {
  data: Order[];
  meta: {
    total: number;
    page: number;
    lastPage: number;
  };
}

/**
 * Mengambil daftar pesanan saya dengan paginasi dan pencarian.
 */
export const getMyOrders = async ({ page, search }: { page: number; search: string }): Promise<PaginatedOrders> => {
  const { data } = await api.get('/orders', {
    params: {
      page,
      limit: 10, // Tampilkan 10 per halaman
      search: search || undefined,
    }
  });
  return data;
};

/**
 * Mengambil satu data pesanan berdasarkan ID-nya.
 */
export const getOrderById = async (orderId: string): Promise<Order> => {
  if (!orderId) {
    throw new Error('Order ID is required');
  }
  const { data } = await api.get(`/orders/${orderId}`);
  return data;
};