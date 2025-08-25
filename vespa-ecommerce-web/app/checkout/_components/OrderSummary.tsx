'use client';

import { useCartStore } from '@/store/cart';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, PackageCheck } from 'lucide-react';

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
  totalAmount: number;
  selectedAddress: Address | null;
  selectedShippingOption: ShippingRate | null;
  vatPercentage: number;
}

export function OrderSummary({ 
  subtotal, 
  taxAmount, 
  shippingCost, 
  totalAmount, 
  selectedAddress, 
  selectedShippingOption,
  vatPercentage,
}: OrderSummaryProps) {
  const router = useRouter();
  const { createOrder, selectedItems, cart } = useCartStore();
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const { user } = useAuthStore();

  const totalItems = cart?.items
    ?.filter(item => selectedItems.has(item.id))
    .reduce((total, item) => total + item.quantity, 0) || 0;

  const handleCreateOrder = async () => {
      if (!selectedAddress || !selectedShippingOption) {
        toast.error("Alamat dan layanan pengiriman harus dipilih.");
        return;
      }
      setIsCreatingOrder(true);
      
      const fullAddress = `${selectedAddress.street}, ${selectedAddress.district}, ${selectedAddress.city}, ${selectedAddress.province}, ${selectedAddress.postalCode}`;
      const courier = `${selectedShippingOption.courier_name.toUpperCase()} - ${selectedShippingOption.courier_service_name}`;
      
      try {
        const newOrder = await createOrder(
          fullAddress, 
          selectedShippingOption.price, 
          courier, 
          selectedAddress.postalCode,
          selectedAddress.districtId
        );
        
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
        setIsCreatingOrder(false);
      }
    };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 sticky top-28">
      <h2 className="text-xl font-bold border-b pb-4 mb-4">Ringkasan Pesanan</h2>
      
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
            {shippingCost > 0 ? formatPrice(shippingCost) : 'Pilih alamat & kurir'}
          </span>
        </div>
        <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
          <span>Total Pembayaran</span>
          <span>{formatPrice(totalAmount)}</span>
        </div>
      </div>

      <div className="mt-6">
        <Button onClick={handleCreateOrder} size="lg" className="w-full" disabled={!selectedAddress || !selectedShippingOption || isCreatingOrder}>
            {isCreatingOrder ? <Loader2 className="mr-2 animate-spin" /> : <PackageCheck className="mr-2" />}
            {isCreatingOrder ? 'Memproses...' : (user?.role === 'RESELLER' ? 'Proses Pesanan' : 'Lanjutkan ke Pembayaran')}
        </Button>
      </div>
    </div>
  );
}