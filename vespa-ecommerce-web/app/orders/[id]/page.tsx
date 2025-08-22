// file: app/orders/[id]/page.tsx
'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, Package, Truck, UploadCloud, CheckCircle, Landmark, Wallet, Copy, Info } from 'lucide-react';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Link from 'next/link';

import api from '@/lib/api';
import { Order } from '@/types';
import { useAuthStore } from '@/store/auth';
import { getOrderById } from '@/services/orderService';
import { getActivePaymentMethods, ManualPaymentMethod } from '@/services/paymentService';
import { Button } from '@/components/ui/button';
import { getTrackingDetails, TrackingDetails } from '@/services/shippingService';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

// Helper Functions
const formatDate = (dateString?: string) => {
  if (!dateString) return 'Tanggal tidak tersedia';
  // Menggunakan metode toLocaleString() yang lebih fleksibel
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

// Komponen untuk menampilkan detail pelacakan (ShipmentTracking)
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
            
            {isLoading && <div className="flex items-center gap-2 text-gray-500 py-4"><Loader2 className="animate-spin h-4 w-4"/> Memuat riwayat pelacakan...</div>}
            {isError && <p className="text-red-500 text-sm py-4">Gagal memuat riwayat pelacakan. Pastikan nomor resi sudah benar.</p>}

            {trackingInfo && (
                <div className="space-y-4">
                    <h3 className="font-semibold text-md text-gray-700">Riwayat Perjalanan:</h3>
                    {trackingInfo.history.map((item, index) => {
                        // 👇 --- PERBAIKAN DI SINI --- 👇
                        // Biteship API (terkadang) mengurutkan dari terlama -> terbaru.
                        // Maka, status terbaru adalah item TERAKHIR.
                        const isLatestStatus = index === trackingInfo.history.length - 1;
                        
                        return (
                            <div key={index} className="flex items-start gap-4">
                                <div className="flex flex-col items-center mt-1">
                                    <div className={`h-4 w-4 rounded-full flex items-center justify-center ${isLatestStatus ? 'bg-primary' : 'bg-gray-300'}`}>
                                        {isLatestStatus && <div className="h-2 w-2 bg-white rounded-full"></div>}
                                    </div>
                                    {/* Tampilkan garis hanya jika bukan item terakhir */}
                                    {index < trackingInfo.history.length - 1 && <div className="w-0.5 h-16 bg-gray-300"></div>}
                                </div>
                                <div>
                                    <p className={`font-semibold ${isLatestStatus ? 'text-primary' : 'text-gray-800'}`}>{item.note}</p>
                                    {/* Gunakan 'item.eventDate' bukan 'item.updated_at' */}
                                    <p className="text-xs text-gray-500">{formatDate(item.eventDate)}</p>
                                </div>
                            </div>
                        );
                        // 👆 --- AKHIR PERBAIKAN --- 👆
                    })}
                </div>
            )}
        </div>
    );
}


// Sisa kode di bawah ini tidak diubah dan sudah benar.
function ResellerPaymentSection({ order, onUploadSuccess }: { order: Order, onUploadSuccess: () => void }) {
    const [isUploading, setIsUploading] = useState(false);
    const [selectedBankId, setSelectedBankId] = useState<string>('');
    const { data: paymentMethods, isLoading: isLoadingBanks } = useQuery<ManualPaymentMethod[]>({
        queryKey: ['activePaymentMethods'],
        queryFn: getActivePaymentMethods,
    });

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!selectedBankId) {
            toast.error("Silakan pilih bank tujuan transfer Anda terlebih dahulu.");
            return;
        }

        setIsUploading(true);
        const toastId = toast.loading('Mengunggah bukti...');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('manualPaymentMethodId', selectedBankId);

        try {
            await api.post(`/upload/payment-proof/${order.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success('Bukti pembayaran berhasil diunggah!', { id: toastId });
            onUploadSuccess();
        } catch (error) {
            toast.error('Gagal mengunggah file.', { id: toastId });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="border-t pt-6 mt-6">
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg text-left mb-6 flex items-start gap-3">
              <Info className="h-5 w-5 mt-0.5 flex-shrink-0"/>
              <div>
                  <p className="font-bold">Selesaikan Pembayaran</p>
                  <p className="text-sm">Lakukan transfer sesuai total tagihan, lalu unggah bukti pembayaran Anda di bawah ini.</p>
              </div>
            </div>

            <div className="space-y-4">
                <h3 className="font-bold text-lg text-gray-800">1. Pilih Bank Tujuan Transfer</h3>
                {isLoadingBanks ? <Loader2 className="animate-spin" /> : (
                    <RadioGroup onValueChange={setSelectedBankId} value={selectedBankId}>
                        {paymentMethods?.map(method => (
                            <Label key={method.id} htmlFor={method.id} className="border p-3 rounded-lg flex items-center justify-between text-sm cursor-pointer has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary">
                                <div className="flex items-center gap-3">
                                    <RadioGroupItem value={method.id} id={method.id} />
                                    <div>
                                        <p className="font-semibold">{method.bankName}</p>
                                        <p className="text-xs text-gray-600">a/n {method.accountHolder}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-mono font-semibold">{method.accountNumber}</p>
                                    <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={(e) => { e.preventDefault(); copyToClipboard(method.accountNumber, method.bankName); }}>Salin</Button>
                                </div>
                            </Label>
                        ))}
                    </RadioGroup>
                )}
            </div>

            <div className="mt-6 space-y-2">
                <h3 className="font-bold text-lg text-gray-800">2. Unggah Bukti Pembayaran</h3>
                <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg transition-colors ${selectedBankId ? 'cursor-pointer hover:bg-gray-100' : 'cursor-not-allowed bg-gray-50'}`}>
                    {isUploading ? <Loader2 className="w-8 h-8 text-gray-400 animate-spin"/> : <><UploadCloud className="w-10 h-10 text-gray-400 mb-2"/><span className="text-sm text-gray-500">Klik untuk memilih file</span></>}
                    <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading || !selectedBankId} accept="image/*"/>
                </label>
                {!selectedBankId && <p className="text-xs text-center text-red-600 mt-1">Pilih bank tujuan di atas untuk mengaktifkan tombol upload.</p>}
            </div>
        </div>
    );
}

// Komponen Utama Halaman
export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrderById(orderId),
    enabled: !!orderId,
  });

  if (isLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin h-8 w-8" /></div>;
  if (isError || !order) return <div className="text-center py-20">Pesanan tidak ditemukan atau terjadi kesalahan.</div>;
  
  const isReseller = user?.role === 'RESELLER';
  const isPending = order.status === 'PENDING';
  const showResellerPaymentFlow = isReseller && isPending;
  const proofHasBeenUploaded = !!order.payment?.proofOfPayment;

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
                       order.status === 'DELIVERED' || order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
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

            {(order.status === 'SHIPPED' || order.status === 'DELIVERED' || order.status === 'COMPLETED') && (
                <ShipmentTracking order={order} />
            )}

          </motion.div>
          
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <h2 className="font-bold text-xl">Ringkasan</h2>
              <div className="flex justify-between"><span>Subtotal:</span> <span>{formatPrice(order.subtotal)}</span></div>
              <div className="flex justify-between"><span>Diskon:</span> <span>- {formatPrice(order.discountAmount)}</span></div>
              <div className="flex justify-between"><span>PPN:</span> <span>{formatPrice(order.taxAmount)}</span></div>
              <div className="flex justify-between"><span>Ongkos Kirim:</span> <span>{formatPrice(order.shippingCost)}</span></div>
              <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                <span>Total:</span> 
                <span>{formatPrice(order.totalAmount)}</span>
              </div>
              
               {showResellerPaymentFlow && (
                 <>
                   {!proofHasBeenUploaded ? (
                     <ResellerPaymentSection 
                        order={order} 
                        onUploadSuccess={() => queryClient.invalidateQueries({ queryKey: ['order', orderId] })}
                     />
                   ) : (
                     <div className="mt-4 border-t pt-4 text-center bg-green-50 p-4 rounded-lg">
                        <CheckCircle className="mx-auto h-10 w-10 text-green-500 mb-2"/>
                        <p className="font-semibold text-green-700">Bukti pembayaran telah diunggah.</p>
                        <p className="text-sm text-green-600">Admin akan segera memverifikasi pesanan Anda.</p>
                     </div>
                   )}
                 </>
               )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}