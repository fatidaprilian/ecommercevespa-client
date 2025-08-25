import api from '@/lib/api';
import { Order } from '@/types';

export interface PaginatedOrders {
  data: Order[];
  meta: {
    total: number;
    page: number;
    lastPage: number;
  };
}

export const getMyOrders = async ({ page, search }: { page: number; search: string }): Promise<PaginatedOrders> => {
  const { data } = await api.get('/orders', {
    params: {
      page,
      limit: 10, 
      search: search || undefined,
    }
  });
  return data;
};

export const getOrderById = async (orderId: string): Promise<Order> => {
  if (!orderId) {
    throw new Error('Order ID is required');
  }
  const { data } = await api.get(`/orders/${orderId}`);
  return data;
};