// file: vespa-ecommerce-admin/pages/services/orderService.ts
import api from '@/lib/api';

// --- Tipe Data untuk Order ---
export interface Order {
  id: string;
  orderNumber: string;
  totalAmount: number;
  shippingCost: number;
  status: string;
  createdAt: string;
  user: {
      id: string;
      name: string;
      email: string;
  };
  // Tambahkan detail lain jika diperlukan
}


/**
 * Mengambil semua data pesanan dari API.
 */
export const getOrders = async (): Promise<Order[]> => {
  const { data } = await api.get('/orders');
  return data;
};