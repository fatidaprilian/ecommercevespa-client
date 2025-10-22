'use client';

// --- (Impor PaymentPreference dari store) ---
import { useCartStore, PaymentPreference } from '@/store/cart';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';
// --- (Impor ikon baru) ---
import { Loader2, PackageCheck, CreditCard, Banknote } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Address } from '@/services/addressService';
import { ShippingRate } from '@/services/shippingService';
import { useAuthStore } from '@/store/auth';

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(price);
};

interface OrderSummaryProps {
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  totalAmount: number; // Ini adalah total SEBELUM admin fee
  selectedAddress: Address | null;
  selectedShippingOption: ShippingRate | null;
  vatPercentage: number;
}

export function OrderSummary({ 
  subtotal, 
  taxAmount, 
  shippingCost, 
  totalAmount, // Ini adalah total dasar
  selectedAddress, 
  selectedShippingOption,
  vatPercentage,
}: OrderSummaryProps) {
  const router = useRouter();
  const { createOrder, selectedItems, cart } = useCartStore();
  // --- (Ubah state loading) ---
  const [loadingMethod, setLoadingMethod] = useState<null | 'cc' | 'other' | 'reseller'>(null);
  const { user } = useAuthStore();

  const totalItems = cart?.items
    ?.filter(item => selectedItems.has(item.id))
    .reduce((total, item) => total + item.quantity, 0) || 0;

  // --- (Hitung biaya admin dan total baru) ---
  const adminFee = totalAmount * 0.03;
  const totalAmountWithFee = totalAmount + adminFee;
  // -----------------------------------------

  // --- (Modifikasi handleCreateOrder untuk menerima preferensi) ---
  const handleCreateOrder = async (preference: PaymentPreference | null) => {
      if (!selectedAddress || !selectedShippingOption) {
        toast.error("Alamat dan layanan pengiriman harus dipilih.");
        return;
      }
      
      // Tentukan state loading berdasarkan tombol yang diklik
      if (preference === PaymentPreference.CREDIT_CARD) {
        setLoadingMethod('cc');
      } else if (preference === PaymentPreference.OTHER) {
        setLoadingMethod('other');
      } else {
        setLoadingMethod('reseller'); // Untuk Reseller
      }
      
      const fullAddress = `${selectedAddress.street}, ${selectedAddress.district}, ${selectedAddress.city}, ${selectedAddress.province}, ${selectedAddress.postalCode}`;
      const courier = `${selectedShippingOption.courier_name.toUpperCase()} - ${selectedShippingOption.courier_service_name}`;
      
      try {
        const newOrder = await createOrder(
          fullAddress, 
          selectedShippingOption.price, 
          courier, 
          selectedAddress.postalCode,
          selectedAddress.districtId,
          preference // <-- Teruskan preferensi ke store
        );
        
        // Logika redirect/toast tetap sama
        if (user?.role === 'RESELLER') {
            toast.success("Pesanan berhasil dibuat dan dikirim ke admin!");
            router.push(`/orders/${newOrder.id}`);
        } else if (newOrder && newOrder.redirect_url) {
            window.location.href = newOrder.redirect_url;
        } else {
            throw new Error('Respons pesanan tidak valid.');
        }
      } catch (error) {
        toast.error("Gagal memproses pesanan. Silakan coba lagi.");
        console.error("Gagal melanjutkan ke pembayaran:", error);
        setLoadingMethod(null); // Reset state loading saat error
      }
    };
  // -----------------------------------------------------------

  return (
    <div className="bg-white rounded-lg shadow-md p-6 sticky top-28">
      <h2 className="text-xl font-bold border-b pb-4 mb-4">Ringkasan Pesanan</h2>
      
      {/* ... (Bagian daftar item tidak berubah) ... */}
      <div className="space-y-3 max-h-60 overflow-y-auto pr-2 mb-4">
        {cart?.items
          ?.filter(item => selectedItems.has(item.id))
          .map(item => (
            <div key={item.id} className="flex justify-between text-sm items-center">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <img src={item.product.images?.[0]?.url || 'https://placehold.co/100x100'} alt={item.product.name} className="w-12 h-12 object-cover rounded-md" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{item.product.name}</p>
                  <p className="text-gray-500">{formatPrice(Number(item.product.price))} x {item.quantity}</p>
                </div>
              </div>
              <span className="font-medium pl-2">{formatPrice(Number(item.product.price) * item.quantity)}</span>
            </div>
        ))}
      </div>
      
      <div className="border-t mt-4 pt-4 space-y-2">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal ({totalItems} item)</span>
          <span className="font-semibold">{formatPrice(subtotal)}</span>
        </div>
        
        <div className="flex justify-between text-gray-600">
          <span>PPN ({vatPercentage > 0 ? vatPercentage : '...'}%)</span>
          <span className="font-semibold">{formatPrice(taxAmount)}</span>
        </div>

        <div className="flex justify-between text-gray-600">
          <span>Ongkos Kirim</span>
          <span className="font-semibold">
            {selectedShippingOption ? formatPrice(shippingCost) : 'Pilih alamat & kurir'}
          </span>
        </div>
        <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
          <span>Total Pembayaran</span>
          {/* Tampilkan total dasar di sini */}
          <span>{formatPrice(totalAmount)}</span>
        </div>
      </div>

      {/* --- (Logika Tombol Pembayaran yang Diubah) --- */}
      <div className="mt-6 space-y-3">
        {/* Tampilkan tombol berdasarkan role user */}
        
        {/* JIKA ROLE RESELLER (Logika Asli) */}
        {user?.role === 'RESELLER' && (
          <Button 
            onClick={() => handleCreateOrder(null)}
            size="lg" 
            className="w-full" 
            disabled={!selectedAddress || !selectedShippingOption || !!loadingMethod} // Disable jika sedang loading
          >
            {loadingMethod === 'reseller' ? <Loader2 className="mr-2 animate-spin" /> : <PackageCheck className="mr-2" />}
            {loadingMethod === 'reseller' ? 'Memproses...' : 'Proses Pesanan'}
          </Button>
        )}

        {/* JIKA ROLE MEMBER (Logika Baru Dua Tombol) */}
        {user?.role === 'MEMBER' && (
          <>
            {/* Tombol Bayar Metode Lain */}
            <Button 
              onClick={() => handleCreateOrder(PaymentPreference.OTHER)}
              size="lg" 
              variant="outline" // Buat sebagai tombol sekunder
              className="w-full flex justify-between items-center" 
              disabled={!selectedAddress || !selectedShippingOption || !!loadingMethod} // Disable jika salah satu sedang loading
            >
              <div className='flex items-center'>
                {loadingMethod === 'other' ? <Loader2 className="mr-2 animate-spin" /> : <Banknote className="mr-2" />}
                {loadingMethod === 'other' ? 'Memproses...' : 'Bayar Menggunakan Metode Lain'}
              </div>
              <span className='font-bold'>{formatPrice(totalAmount)}</span>
            </Button>
            
            {/* Tombol Bayar Kartu Kredit */}
            <Button 
              onClick={() => handleCreateOrder(PaymentPreference.CREDIT_CARD)}
              size="lg" 
              className="w-full h-auto flex flex-col items-start py-3" // Buat tombol lebih tinggi untuk 2 baris teks
              disabled={!selectedAddress || !selectedShippingOption || !!loadingMethod}
            >
              <div className='w-full flex justify-between items-center font-bold'>
                <div className='flex items-center'>
                  {loadingMethod === 'cc' ? <Loader2 className="mr-2 animate-spin" /> : <CreditCard className="mr-2" />}
                  {loadingMethod === 'cc' ? 'Memproses...' : 'Bayar dengan Kartu Kredit'}
                </div>
                <span>{formatPrice(totalAmountWithFee)}</span>
              </div>
              <span className='text-xs font-normal pl-8'>
                (Termasuk Biaya Admin 3%: {formatPrice(adminFee)})
              </span>
            </Button>
          </>
        )}

        {/* Jika user belum login / role tidak diketahui */}
        {!user && (
          <Button size="lg" className="w-full" disabled={true}>
            <Loader2 className="mr-2 animate-spin" />
            Memuat data...
          </Button>
        )}
      </div>
      {/* ------------------------------------------- */}
    </div>
  );
}