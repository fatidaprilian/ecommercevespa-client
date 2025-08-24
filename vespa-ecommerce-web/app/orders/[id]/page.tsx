// file: app/orders/[id]/page.tsx (Revisi Final untuk Alur Reseller)
'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, Package, Truck, UploadCloud, CheckCircle, Landmark, Copy, Info, ArrowLeft, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

import api from '@/lib/api';
import { Order } from '@/types';
import { useAuthStore } from '@/store/auth';
import { getOrderById } from '@/services/orderService';
import { Button } from '@/components/ui/button';
import { getTrackingDetails, TrackingDetails } from '@/services/shippingService';

// Helper Functions
const formatDate = (dateString?: string) => {
  if (!dateString) return 'Tanggal tidak tersedia';
  return new Date(dateString).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatPrice = (price: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);

const copyToClipboard = (text: string, label: string) => {
  navigator.clipboard.writeText(text);
  toast.success(`${label} disalin!`);
};

// Komponen ShipmentTracking (Tidak ada perubahan)
function ShipmentTracking({ order }: { order: Order }) {
    if (!order.shipment?.trackingNumber || !order.courier) {
        return null;
    }
    const courierCode = order.courier.split(' - ')[0].trim().toLowerCase();
    const waybillId = order.shipment.trackingNumber;
    const { data: trackingInfo, isLoading, isError } = useQuery<TrackingDetails>({
        queryKey: ['tracking', waybillId, courierCode],
        queryFn: () => getTrackingDetails(waybillId, courierCode),
        enabled: !!waybillId && !!courierCode,
    });

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h2 className="font-bold text-xl mb-4 flex items-center gap-2"><Truck size={20}/> Informasi Pengiriman</h2>
            <div className="mb-4 pb-4 border-b">
                <p className="text-sm text-gray-500">Kurir</p>
                <p className="font-semibold text-gray-800">{order.courier}</p>
            </div>
            <div className="mb-4 pb-4 border-b">
                <p className="text-sm text-gray-500">Nomor Resi</p>
                <div className="flex items-center gap-2">
                    <p className="font-mono font-semibold text-gray-800">{waybillId}</p>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(waybillId, 'Nomor resi')}>
                        <Copy className="h-4 w-4"/>
                    </Button>
                </div>
            </div>
            {isLoading && <div className="flex items-center gap-2 text-gray-500 py-4"><Loader2 className="animate-spin h-4 w-4"/> Memuat riwayat...</div>}
            {isError && <p className="text-red-500 text-sm py-4">Gagal memuat riwayat pelacakan.</p>}
            {trackingInfo && (
                <div className="space-y-4">
                    <h3 className="font-semibold text-md text-gray-700">Riwayat Perjalanan:</h3>
                    {trackingInfo.history.map((item, index) => {
                        const isLatestStatus = index === trackingInfo.history.length - 1;
                        return (
                            <div key={index} className="flex items-start gap-4">
                                <div className="flex flex-col items-center mt-1">
                                    <div className={`h-4 w-4 rounded-full flex items-center justify-center ${isLatestStatus ? 'bg-primary' : 'bg-gray-300'}`}>
                                        {isLatestStatus && <div className="h-2 w-2 bg-white rounded-full"></div>}
                                    </div>
                                    {index < trackingInfo.history.length - 1 && <div className="w-0.5 h-16 bg-gray-300"></div>}
                                </div>
                                <div>
                                    <p className={`font-semibold ${isLatestStatus ? 'text-primary' : 'text-gray-800'}`}>{item.note}</p>
                                    <p className="text-xs text-gray-500">{formatDate(item.eventDate)}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}


// Komponen Utama Halaman
export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const { user } = useAuthStore();

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrderById(orderId),
    enabled: !!orderId,
  });

  if (isLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin h-8 w-8" /></div>;
  if (isError || !order) return <div className="text-center py-20">Pesanan tidak ditemukan atau terjadi kesalahan.</div>;
  
  const isReseller = user?.role === 'RESELLER';

  // Tentukan status teks berdasarkan peran dan status pesanan
  const getStatusInfo = () => {
      switch (order.status) {
          case 'PENDING':
              return { text: 'Menunggu Konfirmasi Admin', color: 'bg-yellow-100 text-yellow-800' };
          case 'PROCESSING':
              return { text: 'Pesanan Diproses', color: 'bg-orange-100 text-orange-800' };
          case 'SHIPPED':
              return { text: 'Dikirim', color: 'bg-blue-100 text-blue-800' };
          case 'DELIVERED':
          case 'COMPLETED':
              return { text: 'Selesai', color: 'bg-green-100 text-green-800' };
          default:
              return { text: order.status, color: 'bg-gray-100 text-gray-800' };
      }
  };
  const statusInfo = getStatusInfo();


  return (
    <div className="bg-gray-100 min-h-screen pt-12 sm:pt-16 pb-20">
      <div className="container mx-auto px-4 py-8">
        
        <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8"
        >
            <Button onClick={() => router.push('/orders')} variant="ghost" className="mb-4 sm:mb-0 -ml-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Kembali ke Daftar Pesanan
            </Button>
            <div className="text-center sm:text-left">
                <h1 className="text-3xl font-bold text-gray-800">Detail Pesanan</h1>
                <p className="text-gray-500">Order #{order.orderNumber}</p>
            </div>
            <span className={`px-3 py-1.5 text-sm font-bold rounded-full mt-4 sm:mt-0 ${statusInfo.color}`}>
                {statusInfo.text}
            </span>
        </motion.div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2 space-y-6">
            
            {/* --- BLOK INFORMASI UNTUK RESELLER (REVISI) --- */}
            {isReseller && order.status === 'PENDING' && (
                <div className="bg-blue-50 border-l-4 border-blue-400 text-blue-800 p-4 rounded-r-lg shadow">
                    <div className="flex">
                        <div className="py-1"><Info className="h-6 w-6 text-blue-500 mr-4"/></div>
                        <div>
                            <p className="font-bold">Menunggu Pembayaran Faktur</p>
                            <p className="text-sm">Admin telah mengonfirmasi pesanan Anda. Silakan periksa komunikasi Anda (misal: WhatsApp) untuk faktur dan lakukan pembayaran.</p>
                        </div>
                    </div>
                </div>
            )}
            {isReseller && order.status === 'PROCESSING' && (
                <div className="bg-green-50 border-l-4 border-green-400 text-green-800 p-4 rounded-r-lg shadow">
                    <div className="flex">
                        <div className="py-1"><FileText className="h-6 w-6 text-green-500 mr-4"/></div>
                        <div>
                            <p className="font-bold">Pembayaran Diterima</p>
                            <p className="text-sm">Terima kasih! Pembayaran Anda telah kami konfirmasi. Pesanan Anda kini sedang kami siapkan untuk pengiriman.</p>
                        </div>
                    </div>
                </div>
            )}

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

            {(order.status === 'SHIPPED' || order.status === 'DELIVERED' || order.status === 'COMPLETED') && (
                <ShipmentTracking order={order} />
            )}

          </motion.div>
          
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 space-y-4 sticky top-16">
              <h2 className="font-bold text-xl">Ringkasan</h2>
              <div className="flex justify-between"><span>Subtotal:</span> <span>{formatPrice(order.subtotal)}</span></div>
              <div className="flex justify-between"><span>Diskon:</span> <span>- {formatPrice(order.discountAmount)}</span></div>
              <div className="flex justify-between"><span>PPN:</span> <span>{formatPrice(order.taxAmount)}</span></div>
              <div className="flex justify-between"><span>Ongkos Kirim:</span> <span>{formatPrice(order.shippingCost)}</span></div>
              <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                <span>Total:</span> 
                <span>{formatPrice(order.totalAmount)}</span>
              </div>
              
              {/* Logika pembayaran manual untuk member tidak diubah */}
               { !isReseller && order.status === 'PENDING' && order.payment?.method === 'MANUAL_TRANSFER' && (
                 // ... Tampilkan form upload bukti bayar untuk member jika diperlukan
                 <p className="text-center text-sm text-gray-500 mt-4">Silakan upload bukti pembayaran.</p>
               )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}