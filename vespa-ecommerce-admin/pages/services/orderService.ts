// file: vespa-ecommerce-admin/pages/services/orderService.ts
import api from '@/lib/api';

// --- TAMBAHKAN ENUM INI DI SINI ---
export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}
// ------------------------------------

export interface OrderItem {
    id: string;
    quantity: number;
    price: number;
    product: {
        id: string;
        name: string;
        sku: string;
    };
}

export interface Shipment {
    id: string;
    trackingNumber: string | null;
    courier: string;
    createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  totalAmount: number;
  shippingCost: number;
  shippingAddress: string;
  courier: string;
  status: string; // Biarkan ini sebagai string, enum hanya untuk referensi di frontend
  createdAt: string;
  user: {
      id: string;
      name: string;
      email: string;
  };
  items: OrderItem[];
  shipment: Shipment | null;
}

export const getOrders = async (): Promise<Order[]> => {
  const { data } = await api.get('/orders');
  return data;
};

export const getOrderById = async (orderId: string): Promise<Order> => {
    const { data } = await api.get(`/orders/${orderId}`);
    return data;
};