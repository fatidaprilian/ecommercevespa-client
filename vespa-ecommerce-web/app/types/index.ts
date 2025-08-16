// file: app/types/index.ts

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
};

// --- TIPE BARU UNTUK INFORMASI HARGA ---
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
  price: number; // Ini sekarang akan menjadi harga final/diskon
  stock: number;
  images: ProductImage[];
  category: Category;
  brand: Brand | null;
  priceInfo: PriceInfo; // <-- TAMBAHKAN FIELD INI
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
    invoiceUrl?: string;
}

export type Order = {
    id: string;
    orderNumber: string;
    totalAmount: number;
    shippingCost: number;
    courier: string;
    shippingAddress: string;
    status: 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
    createdAt: string;
    items: OrderItem[];
    payment?: Payment;
};