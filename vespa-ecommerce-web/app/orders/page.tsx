// file: app/orders/page.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShoppingBag, ChevronRight, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';
import { Order } from '@/types';

// Helper to format dates
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

// Helper to format currency
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(price);
};

// Function to fetch orders from the API
const getOrders = async (): Promise<Order[]> => {
  const { data } = await api.get('/orders');
  return data;
};

export default function OrdersPage() {
  const { isAuthenticated } = useAuthStore();
  const { data: orders, isLoading, isError } = useQuery({
    queryKey: ['orders'],
    queryFn: getOrders,
    enabled: isAuthenticated,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
       <div className="text-center bg-white p-12 rounded-lg shadow-md mt-28 container mx-auto">
            <ShoppingBag className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">Riwayat Pesanan</h2>
            <p className="text-gray-500 mb-6">Silakan login untuk melihat riwayat pesanan Anda.</p>
            <Link href="/login" className="bg-[#52616B] text-white font-bold py-3 px-6 rounded-lg hover:bg-[#1E2022] transition-colors">
              Login
            </Link>
        </div>
    );
  }
    if (isError || !orders || orders.length === 0) {
    return (
      <div className="text-center bg-white p-12 rounded-lg shadow-md mt-28 container mx-auto">
        <ShoppingBag className="mx-auto h-16 w-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">Belum Ada Pesanan</h2>
        <p className="text-gray-500 mb-6">Anda belum melakukan pesanan apa pun.</p>
        <Link href="/products" className="bg-[#52616B] text-white font-bold py-3 px-6 rounded-lg hover:bg-[#1E2022] transition-colors">
          Mulai Belanja
        </Link>
      </div>
    );
  }


  return (
    <div className="bg-gray-100 min-h-screen pt-28">
      <div className="container mx-auto px-4">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-gray-800 mb-8 font-playfair"
        >
          Riwayat Pesanan
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {orders.map((order, index) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link href={`/orders/${order.id}`} className="block bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-lg">Order #{order.orderNumber}</p>
                    <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{formatPrice(order.totalAmount + order.shippingCost)}</p>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      order.status === 'PAID' ? 'bg-green-100 text-green-800' :
                      order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                   <ChevronRight className="text-gray-400" />
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}