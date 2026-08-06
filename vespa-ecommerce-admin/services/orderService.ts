import api from '@/lib/api';

export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  COMPLETED = 'COMPLETED',
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
  subtotal?: number;
  discountAmount?: number;
  taxAmount?: number;
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
    manualPaymentMethod?: {
      bankName: string;
      accountNumber: string;
    } | null;
  } | null;
}

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
 * Fetches orders from the API with pagination and optional search filter.
 * @param page - Page number to retrieve.
 * @param search - Search keyword (optional).
 */
export const getOrders = async ({
  page,
  search,
}: {
  page: number;
  search: string;
}): Promise<PaginatedOrders> => {
  const { data } = await api.get('/orders', {
    params: {
      page,
      limit: 10,
      search: search || undefined,
    },
  });
  return data;
};

/**
 * Fetches a single order record by its unique ID.
 */
export const getOrderById = async (orderId: string): Promise<Order> => {
  const { data } = await api.get(`/orders/${orderId}`);
  return data;
};

/**
 * Updates the status of an existing order.
 * @param orderId ID of the target order.
 * @param status New status value (e.g. 'CANCELLED', 'REFUNDED').
 * @returns The updated order instance.
 */
export const updateOrderStatus = async (
  orderId: string,
  status: string,
): Promise<Order> => {
  const { data } = await api.patch(`/orders/${orderId}/status`, { status });
  return data;
};