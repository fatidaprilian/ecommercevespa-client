// file: app/orders/[id]/page.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, Package, User, MapPin, Truck } from 'lucide-react';
import Link from 'next/link';

import api from '@/lib/api';
import { Order } from '@/types';

// Helper functions
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
const formatPrice = (price: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);

const getOrderById = async (orderId: string): Promise<Order> => {
  const { data } = await api.get(`/orders/${orderId}`);
  return data;
};

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrderById(orderId),
    enabled: !!orderId,
  });

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin h-8 w-8" /></div>;
  }

  if (isError || !order) {
    return <div className="text-center py-20">Pesanan tidak ditemukan atau terjadi kesalahan.</div>;
  }

  return (
    <div className="bg-gray-100 min-h-screen pt-28">
      <div className="container mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Detail Pesanan</h1>
                    <p className="text-gray-500">Order #{order.orderNumber}</p>
                </div>
                 <span className={`px-3 py-1.5 text-sm font-bold rounded-full ${
                      order.status === 'PAID' ? 'bg-green-100 text-green-800' :
                      order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status}
                    </span>
            </div>
        </motion.div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Order Items */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="font-bold text-xl mb-4 flex items-center gap-2"><Package size={20}/> Item Pesanan</h2>
              <div className="space-y-4">
                {order.items.map(item => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <img src={item.product.images?.[0]?.url || 'https://placehold.co/100x100'} alt={item.product.name} className="w-16 h-16 object-cover rounded-md" />
                      <div>
                        <p className="font-semibold">{item.product.name}</p>
                        <p className="text-sm text-gray-500">{item.quantity} x {formatPrice(item.price)}</p>
                      </div>
                    </div>
                    <p className="font-semibold">{formatPrice(item.quantity * item.price)}</p>
                  </div>
                ))}
              </div>
            </div>

             {/* Shipping Details */}
            <div className="bg-white rounded-lg shadow p-6">
                 <h2 className="font-bold text-xl mb-4 flex items-center gap-2"><Truck size={20}/> Detail Pengiriman</h2>
                 <div className="space-y-2 text-gray-700">
                    <p><span className="font-semibold">Kurir:</span> {order.courier}</p>
                    <p><span className="font-semibold">Alamat:</span> {order.shippingAddress}</p>
                 </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1"
          >
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <h2 className="font-bold text-xl">Ringkasan</h2>
               <div className="flex justify-between"><span>Subtotal:</span> <span>{formatPrice(order.totalAmount)}</span></div>
               <div className="flex justify-between"><span>Ongkos Kirim:</span> <span>{formatPrice(order.shippingCost)}</span></div>
               <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2"><span>Total:</span> <span>{formatPrice(order.totalAmount + order.shippingCost)}</span></div>

               {order.status === 'PENDING' && order.payment?.invoiceUrl && (
                    <a href={order.payment.invoiceUrl} target="_blank" rel="noopener noreferrer" className="w-full mt-4 bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center">
                        Lanjutkan Pembayaran
                    </a>
               )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}