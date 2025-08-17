// file: app/orders/[id]/page.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, Package, Truck, UploadCloud, CheckCircle, Landmark, Wallet } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

import api from '@/lib/api';
import { Order } from '@/types';
import { useAuthStore } from '@/store/auth';
import { getOrderById } from '@/services/orderService';
import { getActivePaymentMethods, ManualPaymentMethod } from '@/services/paymentService';
import { Button } from '@/components/ui/button';

// Helper functions
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const formatPrice = (price: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
const copyToClipboard = (text: string, bankName: string) => {
  navigator.clipboard.writeText(text);
  toast.success(`Nomor rekening ${bankName} disalin!`);
};

// Komponen untuk menampilkan detail rekening bank (untuk reseller)
function ManualPaymentDetails() {
    const { data: paymentMethods, isLoading } = useQuery({
        queryKey: ['activePaymentMethods'],
        queryFn: getActivePaymentMethods,
    });

    if (isLoading) return <div className="text-center p-4"><Loader2 className="animate-spin mx-auto"/></div>;

    return (
        <div className="mt-4 border-t pt-4 text-left space-y-4">
            <h3 className="font-bold text-lg text-gray-800">1. Lakukan Pembayaran</h3>
            <p className="text-sm text-gray-500">Silakan transfer total pembayaran ke salah satu rekening di bawah ini.</p>
            {paymentMethods?.map(method => (
                <div key={method.id} className="border p-3 rounded-lg flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                        {method.logoUrl ? <img src={method.logoUrl} alt={method.bankName} className="h-6 w-auto"/> : <Landmark className="h-6 w-6 text-gray-400"/>}
                        <div>
                            <p className="font-semibold">{method.bankName}</p>
                            <p className="text-xs text-gray-600">{method.accountHolder}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="font-mono font-semibold">{method.accountNumber}</p>
                        <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => copyToClipboard(method.accountNumber, method.bankName)}>Salin</Button>
                    </div>
                </div>
            ))}
        </div>
    );
}

// Komponen untuk form upload (untuk reseller)
function UploadProofForm({ orderId }: { orderId: string }) {
    const queryClient = useQueryClient();
    const [isUploading, setIsUploading] = useState(false);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const toastId = toast.loading('Mengunggah bukti pembayaran...');
        const formData = new FormData();
        formData.append('file', file);

        try {
            await api.post(`/upload/payment-proof/${orderId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success('Bukti pembayaran berhasil diunggah!', { id: toastId });
            queryClient.invalidateQueries({ queryKey: ['order', orderId] });
        } catch (error) {
            toast.error('Gagal mengunggah file.', { id: toastId });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="mt-4 border-t pt-4 text-left">
            <h3 className="font-bold text-lg text-gray-800">2. Unggah Bukti Pembayaran</h3>
            <p className="text-sm text-gray-500 mb-4">Setelah transfer berhasil, unggah bukti Anda di sini.</p>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                {isUploading ? <Loader2 className="w-8 h-8 text-gray-400 animate-spin"/> : <><UploadCloud className="w-10 h-10 text-gray-400 mb-2"/><span className="text-sm text-gray-500">Klik untuk memilih file</span></>}
                <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} accept="image/*"/>
            </label>
        </div>
    );
}

// Komponen Utama Halaman
export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;
  const { user } = useAuthStore();

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrderById(orderId),
    enabled: !!orderId,
  });

  if (isLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin h-8 w-8" /></div>;
  if (isError || !order) return <div className="text-center py-20">Pesanan tidak ditemukan atau terjadi kesalahan.</div>;
  
  // Variabel kondisional untuk logika tampilan
  const isResellerPending = user?.role === 'RESELLER' && order.status === 'PENDING';
  const isMemberPending = user?.role === 'MEMBER' && order.status === 'PENDING';
  const proofHasBeenUploaded = isResellerPending && order.payment?.proofOfPayment;
  const showUploadForm = isResellerPending && !proofHasBeenUploaded;

  const paymentUrl = order.payment?.redirectUrl;

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
                      order.status === 'PROCESSING' ? 'bg-orange-100 text-orange-800' :
                      order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status}
                    </span>
            </div>
        </motion.div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2 space-y-6">
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
            <div className="bg-white rounded-lg shadow p-6">
                 <h2 className="font-bold text-xl mb-4 flex items-center gap-2"><Truck size={20}/> Detail Pengiriman</h2>
                 <div className="space-y-2 text-gray-700">
                    <p><span className="font-semibold">Kurir:</span> {order.courier}</p>
                    <p><span className="font-semibold">Alamat:</span> {order.shippingAddress}</p>
                 </div>
            </div>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <h2 className="font-bold text-xl">Ringkasan</h2>
              <div className="flex justify-between"><span>Subtotal:</span> <span>{formatPrice(order.totalAmount)}</span></div>
              <div className="flex justify-between"><span>Ongkos Kirim:</span> <span>{formatPrice(order.shippingCost)}</span></div>
              <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2"><span>Total:</span> <span>{formatPrice(order.totalAmount + order.shippingCost)}</span></div>
               
               {isMemberPending && paymentUrl && (
                    <div className="border-t pt-4">
                        <a href={paymentUrl} target="_blank" rel="noopener noreferrer" className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                            <Wallet size={18}/> Lanjutkan Pembayaran
                        </a>
                    </div>
               )}
               
               {isResellerPending && <ManualPaymentDetails />}

               {showUploadForm && <UploadProofForm orderId={order.id} />}
               
               {proofHasBeenUploaded && (
                   <div className="mt-4 border-t pt-4 text-center bg-green-50 p-4 rounded-lg">
                       <CheckCircle className="mx-auto h-10 w-10 text-green-500 mb-2"/>
                       <p className="font-semibold text-green-700">Bukti pembayaran telah diunggah.</p>
                       <p className="text-sm text-green-600">Admin akan segera memverifikasi pesanan Anda.</p>
                   </div>
               )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}