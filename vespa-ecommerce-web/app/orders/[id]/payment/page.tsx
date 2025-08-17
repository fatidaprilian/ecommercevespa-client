// file: app/orders/[id]/payment/page.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, Info, Landmark } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

import { useCartStore } from '@/store/cart';
import { Order } from '@/types';
import { getOrderById } from '@/services/orderService';
import { getActivePaymentMethods, ManualPaymentMethod } from '@/services/paymentService';
import { Button } from '@/components/ui/button';

// Helper functions
const formatPrice = (price: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
const copyToClipboard = (text: string, bankName: string) => {
  navigator.clipboard.writeText(text);
  toast.success(`Nomor rekening ${bankName} disalin!`);
};

export default function PaymentInstructionPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const { clearClientCart } = useCartStore();

  const { data: order, isLoading: isLoadingOrder, isError: isOrderError } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrderById(orderId),
    enabled: !!orderId,
  });

  const { data: paymentMethods, isLoading: isLoadingMethods } = useQuery({
    queryKey: ['activePaymentMethods'],
    queryFn: getActivePaymentMethods,
  });

  useEffect(() => {
    if (order) {
      if (order.status !== 'PENDING') {
        toast.error("Pesanan ini sudah tidak menunggu pembayaran.");
        router.replace(`/orders/${order.id}`);
      } else {
        // Pembersihan keranjang terjadi di sini, setelah navigasi berhasil
        clearClientCart();
      }
    }
  }, [order, router, clearClientCart]);

  const isLoading = isLoadingOrder || isLoadingMethods;
  if (isLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin h-8 w-8" /></div>;
  if (isOrderError || !order) return <div className="text-center py-20">Pesanan tidak ditemukan.</div>;

  const totalAmount = order.totalAmount + order.shippingCost;

  return (
    <div className="bg-gray-100 min-h-screen pt-28">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-lg shadow-lg p-8 text-center"
        >
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h1 className="text-3xl font-bold text-gray-800 font-playfair">Pesanan Berhasil Dibuat!</h1>
          <p className="text-gray-500 mt-2">Order ID: <span className="font-semibold text-gray-700">{order.orderNumber}</span></p>

          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg text-left my-6 flex items-start gap-3">
            <Info className="h-5 w-5 mt-0.5 flex-shrink-0"/>
            <div>
                <p className="font-bold">Lakukan Pembayaran Sebelum Stok Habis</p>
                <p className="text-sm">Selesaikan pembayaran Anda untuk memastikan pesanan Anda dapat segera kami proses.</p>
            </div>
          </div>

          <div className="text-left border-b pb-6 mb-6">
            <h2 className="font-bold text-xl mb-2">Total Pembayaran</h2>
            <p className="text-4xl font-bold text-primary tracking-tight">{formatPrice(totalAmount)}</p>
            <p className="text-sm text-gray-500">Pastikan Anda mentransfer dengan jumlah yang sama persis.</p>
          </div>
          
          <div className="text-left">
            <h2 className="font-bold text-xl mb-4">Transfer ke salah satu rekening berikut:</h2>
            <div className="space-y-4">
                {paymentMethods?.map(method => (
                    <div key={method.id} className="border p-4 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {method.logoUrl ? <img src={method.logoUrl} alt={method.bankName} className="h-8 w-auto"/> : <Landmark className="h-8 w-8 text-gray-400"/>}
                            <div>
                                <p className="font-bold text-lg">{method.bankName}</p>
                                <p className="text-sm text-gray-600">{method.accountHolder}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-mono text-lg font-semibold">{method.accountNumber}</p>
                            <Button variant="link" size="sm" className="h-auto p-0" onClick={() => copyToClipboard(method.accountNumber, method.bankName)}>
                                Salin Nomor
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
          </div>
          
          <div className="mt-8">
             <Button asChild size="lg" className="w-full">
                <Link href={`/orders/${order.id}`}>
                    Saya Sudah Bayar, Lanjutkan ke Upload Bukti
                </Link>
             </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}