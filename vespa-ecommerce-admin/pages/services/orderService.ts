// file: vespa-ecommerce-admin/pages/services/orderService.ts
import api from '@/lib/api';

// Enum ini membantu menjaga konsistensi status di frontend
export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export interface OrderItem {
    id: string;
    quantity: number;
    price: number;
    product: {
        id: string;
        name: string;
        sku: string;
        weight?: number; // Pastikan weight ada untuk kalkulasi ulang jika perlu
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
  destinationPostalCode?: string; // Diperlukan untuk kalkulasi ulang ongkir di admin
  destinationAreaId?: string;     // Diperlukan untuk kalkulasi ulang ongkir di admin
  courier: string;
  status: string; // Tetap string agar fleksibel, tapi gunakan OrderStatus untuk perbandingan
  createdAt: string;
  user: {
      id: string;
      name: string;
      email: string;
  };
  items: OrderItem[];
  shipment: Shipment | null;
  payment?: {
      proofOfPayment?: string | null;
  } | null;
}

export const getOrders = async (): Promise<Order[]> => {
  const { data } = await api.get('/orders');
  return data;
};

export const getOrderById = async (orderId: string): Promise<Order> => {
    const { data } = await api.get(`/orders/${orderId}`);
    return data;
};