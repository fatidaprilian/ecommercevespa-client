// file: app/checkout/_components/OrderSummary.tsx
'use client';

import { useCartStore } from '@/store/cart';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, PackageCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Address } from '@/services/addressService';
import { ShippingRate } from '@/services/shippingService';

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(price);
};

interface OrderSummaryProps {
  shippingCost: number | null;
  selectedAddress: Address | null;
  selectedShippingOption: ShippingRate | null;
}

export function OrderSummary({ shippingCost, selectedAddress, selectedShippingOption }: OrderSummaryProps) {
  const router = useRouter();
  const { cart, selectedItems, createOrder } = useCartStore();
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  
  const selectedCartItems = cart?.items?.filter(item => selectedItems.has(item.id)) || [];
  const subtotal = selectedCartItems.reduce((total, item) => total + Number(item.product.price) * item.quantity, 0);
  const totalItems = selectedCartItems.reduce((total, item) => total + item.quantity, 0);
  const finalTotal = subtotal + (shippingCost || 0);

  const handleCreateOrder = async () => {
      if (!selectedAddress || !selectedShippingOption) {
        toast.error("Alamat dan layanan pengiriman harus dipilih.");
        return;
      }
      setIsCreatingOrder(true);
      
      const fullAddress = `${selectedAddress.street}, ${selectedAddress.district}, ${selectedAddress.city}, ${selectedAddress.province}, ${selectedAddress.postalCode}`;
      const courier = `${selectedShippingOption.courier_name.toUpperCase()} - ${selectedShippingOption.courier_service_name}`;
      
      try {
        // 👇 **PERUBAHAN UTAMA DI SINI** 👇
        const newOrder = await createOrder(
          fullAddress, 
          selectedShippingOption.price, 
          courier, 
          selectedAddress.postalCode,
          selectedAddress.districtId // Kirim districtId sebagai destinationAreaId
        );
        
        if (newOrder && newOrder.redirect_url) {
          window.location.href = newOrder.redirect_url;
        } else if (newOrder) {
          router.push(`/orders/${newOrder.id}/payment`);
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
        {selectedCartItems.map(item => (
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
          <span>Ongkos Kirim</span>
          <span className="font-semibold">
            {shippingCost !== null ? formatPrice(shippingCost) : 'Pilih alamat & kurir'}
          </span>
        </div>
        <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
          <span>Total</span>
          <span>{formatPrice(finalTotal)}</span>
        </div>
      </div>

      <div className="mt-6">
        <Button onClick={handleCreateOrder} size="lg" className="w-full" disabled={!selectedAddress || !selectedShippingOption || isCreatingOrder}>
            {isCreatingOrder ? <Loader2 className="mr-2 animate-spin" /> : <PackageCheck className="mr-2" />}
            {isCreatingOrder ? 'Memproses...' : 'Lanjutkan ke Pembayaran'}
        </Button>
      </div>
    </div>
  );
}