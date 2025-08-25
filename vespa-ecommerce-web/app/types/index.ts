export type ProductImage = {
  id: string;
  url: string;
};

export type Category = {
  id: string;
  name: string;
};

export type Brand = {
  id: string;
  name: string;
  logoUrl?: string; 
};

export type PriceInfo = {
  originalPrice: number;
  discountPercentage: number;
  finalPrice: number;
  appliedRule: 'PRODUCT' | 'CATEGORY' | 'DEFAULT' | 'NONE';
};

export type Product = {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  price: number;
  stock: number;
  weight?: number; 
  images: ProductImage[];
  category: Category;
  brand: Brand | null;
  priceInfo: PriceInfo;
};

export type User = {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'RESELLER' | 'MEMBER';
};

export type OrderItem = {
    id: string;
    quantity: number;
    price: number;
    product: Product;
}

export type Payment = {
    id: string;
    status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED';
    method: 'MIDTRANS_SNAP' | 'MANUAL_TRANSFER'; 
    transactionId?: string; 
    proofOfPayment?: string; 
}

export type Shipment = {
    id: string;
    trackingNumber: string | null;
    courier: string;
    createdAt: string;
}

export type Order = {
    id: string;
    orderNumber: string;
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    totalAmount: number;
    shippingCost: number;
    courier: string;
    shippingAddress: string;
    status: 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
    createdAt: string;
    items: OrderItem[];
    payment?: Payment;
    shipment?: Shipment;
};