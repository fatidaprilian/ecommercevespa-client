export interface OrderItemData {
  productId: string;
  quantity: number;
}

export interface CreateOrderData {
  items: OrderItemData[];
  shippingAddress: string;
}

export interface ShippingCost {
  service: string;
  description: string;
  cost: {
    value: number;
    etd: string;
    note: string;
  }[];
}