// file: vespa-ecommerce-web/app/types/checkout.ts

// Tipe data untuk item yang dikirim saat membuat pesanan
export interface OrderItemData {
  productId: string;
  quantity: number;
}

// Tipe data untuk payload saat membuat pesanan
export interface CreateOrderData {
  items: OrderItemData[];
  shippingAddress: string;
}

// Tipe data untuk hasil kalkulasi ongkos kirim dari RajaOngkir
export interface ShippingCost {
  service: string;
  description: string;
  cost: {
    value: number;
    etd: string;
    note: string;
  }[];
}