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
        weight?: number;
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
  destinationPostalCode?: string;
  destinationAreaId?: string;
  courier: string;
  status: string;
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
      manualPaymentMethod?: { // Tambahkan ini untuk detail bank
        bankName: string;
        accountNumber: string;
      } | null;
  } | null;
}

// 👇 --- PERUBAHAN UTAMA DI SINI --- 👇

// 1. Definisikan tipe data untuk respons paginasi
export interface PaginatedOrders {
  data: Order[];
  meta: {
    total: number;
    page: number;
    limit: number;
    lastPage: number;
  };
}

/**
 * Mengambil pesanan dari API dengan paginasi dan pencarian.
 * @param page - Nomor halaman yang ingin diambil.
 * @param search - Kata kunci pencarian (opsional).
 */
export const getOrders = async ({ page, search }: { page: number; search: string }): Promise<PaginatedOrders> => {
  const { data } = await api.get('/orders', {
    params: {
      page,
      limit: 10, // Menampilkan 10 pesanan per halaman
      search: search || undefined,
    },
  });
  return data;
};
// 👆 --- AKHIR PERUBAHAN --- 👆


export const getOrderById = async (orderId: string): Promise<Order> => {
    const { data } = await api.get(`/orders/${orderId}`);
    return data;
};