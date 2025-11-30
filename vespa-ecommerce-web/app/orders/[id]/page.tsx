// File: app/orders/[id]/page.tsx
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // Impor useQueryClient
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Loader2,
  Package,
  Truck,
  UploadCloud,
  Copy,
  Info,
  ArrowLeft,
  FileText,
  CreditCard,
  Banknote,
  Clock,
} from 'lucide-react';
import { useState, useEffect } from 'react'; // Impor useEffect
import toast from 'react-hot-toast';
import { addHours } from 'date-fns';

import api from '@/lib/api';
import { Order } from '@/types';
import { useAuthStore } from '@/store/auth';
import { getOrderById } from '@/services/orderService';
import { Button } from '@/components/ui/button';
import { getTrackingDetails, TrackingDetails } from '@/services/shippingService';
import { PaymentPreference } from '@/store/cart';
import Image from 'next/image';

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

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(price);
};

const copyToClipboard = (text: string, label: string) => {
  navigator.clipboard.writeText(text);
  toast.success(`${label} disalin!`);
};

function ShipmentTracking({ order }: { order: Order }) {
  if (!order.shipment?.trackingNumber || !order.courier) {
    return null;
  }

  const courierCode = order.courier.split(' - ')[0].trim().toLowerCase();
  const waybillId = order.shipment.trackingNumber;

  const {
    data: trackingInfo,
    isLoading,
    isError,
  } = useQuery<TrackingDetails>({
    queryKey: ['tracking', waybillId, courierCode],
    queryFn: () => getTrackingDetails(waybillId, courierCode),
    enabled: !!waybillId && !!courierCode,
  });

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="font-bold text-xl mb-4 flex items-center gap-2">
        <Truck size={20} /> Informasi Pengiriman
      </h2>
      <div className="mb-4 pb-4 border-b">
        <p className="text-sm text-gray-500">Kurir</p>
        <p className="font-semibold text-gray-800">{order.courier}</p>
      </div>
      <div className="mb-4 pb-4 border-b">
        <p className="text-sm text-gray-500">Nomor Resi</p>
        <div className="flex items-center gap-2">
          <p className="font-mono font-semibold text-gray-800">{waybillId}</p>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => copyToClipboard(waybillId, 'Nomor resi')}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {isLoading && (
        <div className="flex items-center gap-2 text-gray-500 py-4">
          <Loader2 className="animate-spin h-4 w-4" /> Memuat riwayat...
        </div>
      )}
      {isError && (
        <p className="text-red-500 text-sm py-4">Gagal memuat riwayat pelacakan.</p>
      )}
      {trackingInfo && (
        <div className="space-y-4">
          <h3 className="font-semibold text-md text-gray-700">Riwayat Perjalanan:</h3>
          {trackingInfo.history.map((item, index) => {
            const isLatestStatus = index === trackingInfo.history.length - 1;
            return (
              <div key={index} className="flex items-start gap-4">
                <div className="flex flex-col items-center mt-1">
                  <div
                    className={`h-4 w-4 rounded-full flex items-center justify-center ${
                      isLatestStatus ? 'bg-primary' : 'bg-gray-300'
                    }`}
                  >
                    {isLatestStatus && (
                      <div className="h-2 w-2 bg-white rounded-full"></div>
                    )}
                  </div>
                  {index < trackingInfo.history.length - 1 && (
                    <div className="w-0.5 h-16 bg-gray-300"></div>
                  )}
                </div>
                <div>
                  <p
                    className={`font-semibold ${
                      isLatestStatus ? 'text-primary' : 'text-gray-800'
                    }`}
                  >
                    {item.note}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(item.updated_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient(); // Ambil queryClient
  
  // ========= REVISI DI SINI =========
  // Ambil ID database asli (bagian sebelum tanda hubung '-')
  // Ini akan mengatasi error 404 saat Midtrans redirect kembali
  const paramId = params.id as string;
  const orderId = paramId.split('-')[0];
  // ================================

  const { user } = useAuthStore();

  const {
    data: order,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['order', orderId], // 'orderId' di sini sudah bersih
    queryFn: () => getOrderById(orderId),
    enabled: !!orderId,
  });

  // --- TAMBAHAN: Logika untuk refresh data saat kembali dari Midtrans ---
  useEffect(() => {
    // Jika paramId (dari URL) memiliki timestamp, berarti
    // kita baru saja kembali dari Midtrans.
    if (paramId !== orderId) {
      toast('Memperbarui status pesanan...', { icon: '🔄' });
      // Invalidate query untuk memaksa refetch data terbaru
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      
      // Ganti URL di browser agar bersih (menghapus timestamp)
      // tanpa me-reload halaman.
      window.history.replaceState(null, '', `/orders/${orderId}`);
    }
  }, [paramId, orderId, queryClient]);
  // --- AKHIR TAMBAHAN ---

  const [loadingMethod, setLoadingMethod] = useState<null | 'cc' | 'other'>(null);

  const retryPaymentMutation = useMutation({
    mutationFn: async (preference?: PaymentPreference) => {
      // 'orderId' di sini adalah ID database yang bersih, yang mana sudah benar
      const { data } = await api.post(`/payments/order/${orderId}/retry`, {
        paymentPreference: preference,
      });
      return data;
    },
    onSuccess: (data) => {
      if (data.redirect_url) {
        toast.success('Mengarahkan ke halaman pembayaran...');
        window.location.href = data.redirect_url;
      } else {
        toast.error('Gagal mendapatkan link pembayaran.');
        setLoadingMethod(null);
      }
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Gagal memulai ulang pembayaran.',
      );
      setLoadingMethod(null);
    },
  });

  const handleRetryPayment = (preference?: PaymentPreference) => {
    setLoadingMethod(
      preference === PaymentPreference.CREDIT_CARD ? 'cc' : 'other',
    );
    retryPaymentMutation.mutate(preference);
  };

  let expirationTime: Date | null = null;
  let formattedExpiration: string | null = null;

  if (
    order &&
    order.status === 'PENDING' &&
    user?.role === 'MEMBER' &&
    order.payment?.method === 'MIDTRANS_SNAP'
  ) {
    const createdAt = new Date(order.createdAt);
    expirationTime = addHours(createdAt, 24);
    formattedExpiration = expirationTime.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="text-center py-20">
        Pesanan tidak ditemukan atau terjadi kesalahan.
      </div>
    );
  }

  const isMember = user?.role === 'MEMBER';
  const isReseller = user?.role === 'RESELLER';

  const getStatusInfo = () => {
    switch (order.status) {
      case 'PENDING':
        return {
          text: isReseller ? 'Menunggu Konfirmasi Admin' : 'Menunggu Pembayaran',
          color: 'bg-yellow-100 text-yellow-800',
        };
      case 'PROCESSING':
        return {
          text: 'Pesanan Diproses',
          color: 'bg-orange-100 text-orange-800',
        };
      case 'SHIPPED':
        return { text: 'Dikirim', color: 'bg-blue-100 text-blue-800' };
      case 'DELIVERED':
      case 'COMPLETED':
        return { text: 'Selesai', color: 'bg-green-100 text-green-800' };
      case 'CANCELLED':
        return { text: 'Dibatalkan', color: 'bg-red-100 text-red-800' };
      case 'REFUNDED':
        return { text: 'Dikembalikan', color: 'bg-gray-100 text-gray-800' };
      default:
        return { text: order.status, color: 'bg-gray-100 text-gray-800' };
    }
  };

  const statusInfo = getStatusInfo();

  // Hitung total untuk opsi retry payment
  const baseTotal =
    order.subtotal -
    order.discountAmount +
    order.taxAmount +
    order.shippingCost;
  const adminFeePercentage = 0.03;
  const ccTotal = baseTotal * (1 + adminFeePercentage);

  return (
    <div className="bg-gray-100 min-h-screen pt-12 sm:pt-16 pb-20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8"
        >
          <Button
            onClick={() => router.push('/orders')}
            variant="ghost"
            className="mb-4 sm:mb-0 -ml-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Daftar Pesanan
          </Button>
          <div className="text-center sm:text-left">
            <h1 className="text-3xl font-bold text-gray-800">Detail Pesanan</h1>
            <p className="text-gray-500">Order #{order.orderNumber}</p>
          </div>
          <span
            className={`px-3 py-1.5 text-sm font-bold rounded-full mt-4 sm:mt-0 ${statusInfo.color}`}
          >
            {statusInfo.text}
          </span>
        </motion.div>

        {/* Pesan Batas Waktu Pembayaran */}
        {formattedExpiration && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 p-4 rounded-r-lg shadow mb-6"
          >
            <div className="flex items-center">
              <Clock className="h-6 w-6 text-yellow-500 mr-3 flex-shrink-0" />
              <div>
                <p className="font-bold">Segera Selesaikan Pembayaran</p>
                <p className="text-sm">
                  Harap lakukan pembayaran sebelum:{' '}
                  <strong className="font-semibold">
                    {formattedExpiration} WIB
                  </strong>
                  .
                </p>
                <p className="text-xs mt-1">
                  Pesanan akan dibatalkan otomatis jika melewati batas waktu.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Kolom Kiri */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Info untuk Reseller */}
            {isReseller && order.status === 'PENDING' && (
              <div className="bg-blue-50 border-l-4 border-blue-400 text-blue-800 p-4 rounded-r-lg shadow">
                <div className="flex">
                  <div className="py-1">
                    <Info className="h-6 w-6 text-blue-500 mr-4" />
                  </div>
                  <div>
                    <p className="font-bold">Menunggu Pembayaran</p>
                    <p className="text-sm">
                      Admin telah mengonfirmasi pesanan Anda. Silakan{' '}
                      <a
                        href="https://wa.me/628131010025"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline font-medium"
                      >
                        hubungi kami via WhatsApp
                      </a>{' '}
                      untuk faktur dan lakukan pembayaran.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isReseller && order.status === 'PROCESSING' && (
  <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-900 p-4 rounded-r-lg shadow-sm mb-6">
    <div className="flex items-start">
      <div className="flex-shrink-0 pt-1">
        {/* Gunakan Icon Truck atau Package untuk menekankan barang fisik */}
        <Truck className="h-5 w-5 text-blue-600 mr-3" />
      </div>
      <div>
        <p className="font-bold text-base">Pesanan Dalam Proses Pengiriman</p>
        <p className="text-sm mt-1 text-blue-800">
          Faktur penjualan telah diterbitkan. Barang Anda sedang disiapkan atau dalam perjalanan oleh tim gudang kami.
        </p>
        
        {/* Bagian ini PENTING agar tidak rancu soal pembayaran */}
        <div className="mt-2 flex items-center p-2 bg-blue-100 rounded text-xs font-medium text-blue-700 w-fit">
           <Info className="w-3 h-3 mr-1.5" />
           Status Tagihan: Menunggu Pelunasan
        </div>
      </div>
    </div>
  </div>
)}

            {/* Item Pesanan */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="font-bold text-xl mb-4 flex items-center gap-2">
                <Package size={20} /> Item Pesanan
              </h2>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative w-16 h-16 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                      {item.product.images?.[0]?.url && (
                        <Image
                          src={item.product.images[0].url}
                          alt={item.product.name}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      )}
                    </div>
                      <div>
                        <p className="font-semibold">{item.product.name}</p>
                        <p className="text-sm text-gray-500">
                          {item.quantity} x {formatPrice(item.price)}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold">
                      {formatPrice(item.quantity * item.price)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tracking Pengiriman */}
            {(order.status === 'SHIPPED' ||
              order.status === 'DELIVERED' ||
              order.status === 'COMPLETED') && (
              <ShipmentTracking order={order} />
            )}

            {/* Upload Bukti Transfer */}
            {!isReseller &&
              order.status === 'PENDING' &&
              order.payment?.method === 'MANUAL_TRANSFER' && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="font-bold text-xl mb-4 flex items-center gap-2">
                    <UploadCloud size={20} /> Upload Bukti Pembayaran
                  </h2>
                  <p className="text-sm text-gray-500">
                    Fitur upload bukti transfer akan ditambahkan di sini.
                  </p>
                  <Button className="mt-4 w-full">Upload Bukti</Button>
                </div>
              )}
          </motion.div>

          {/* Kolom Kanan - Ringkasan */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1"
          >
            <div className="bg-white rounded-lg shadow p-6 space-y-4 sticky top-16">
              <h2 className="font-bold text-xl">Ringkasan</h2>
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>PPN:</span>
                <span>{formatPrice(order.taxAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Ongkos Kirim:</span>
                <span>{formatPrice(order.shippingCost)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                <span>Total Asli:</span>
                <span>{formatPrice(order.totalAmount)}</span>
              </div>

              {/* Tombol Retry Payment */}
              {isMember &&
                order.status === 'PENDING' &&
                order.payment?.method === 'MIDTRANS_SNAP' && (
                  <div className="border-t pt-4 mt-4 space-y-3">
                    <p className="text-sm text-center text-gray-600 font-medium">
                      Selesaikan atau ubah metode pembayaran:
                    </p>

                    <Button
                      onClick={() => handleRetryPayment(PaymentPreference.OTHER)}
                      variant="outline"
                      className="w-full justify-between"
                      disabled={!!loadingMethod}
                    >
                      <span className="flex items-center">
                        {loadingMethod === 'other' ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Banknote className="mr-2 h-4 w-4" />
                        )}
                        {loadingMethod === 'other' ? 'Memproses...' : 'Metode Lain'}
                      </span>
                      <span className="font-bold">{formatPrice(baseTotal)}</span>
                    </Button>

                    <Button
                      onClick={() =>
                        handleRetryPayment(PaymentPreference.CREDIT_CARD)
                      }
                      className="w-full justify-between"
                      disabled={!!loadingMethod}
                    >
                      <span className="flex items-center">
                        {loadingMethod === 'cc' ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CreditCard className="mr-2 h-4 w-4" />
                        )}
                        {loadingMethod === 'cc' ? 'Memproses...' : 'Kartu Kredit'}
                      </span>
                      <span className="font-bold">{formatPrice(ccTotal)}</span>
                    </Button>

                    <p className="text-xs text-center text-gray-500">
                      Total Kartu Kredit sudah termasuk biaya admin 3%.
                    </p>
                  </div>
                )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}