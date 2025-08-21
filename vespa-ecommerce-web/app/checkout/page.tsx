// file: app/checkout/page.tsx
'use client';

import { useCartStore } from '@/store/cart';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

import { AddressForm } from './_components/AddressForm';
import { OrderSummary } from './_components/OrderSummary';
import { Address } from '@/services/addressService';
import { ShippingRate } from '@/services/shippingService';

export default function CheckoutPage() {
  const { cart, selectedItems, getSummary } = useCartStore(); // Ambil fungsi getSummary
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [selectedShippingOption, setSelectedShippingOption] = useState<ShippingRate | null>(null);

  const selectedCartItems = cart?.items?.filter(item => selectedItems.has(item.id)) || [];

  useEffect(() => {
    const checkAuth = setTimeout(() => {
        if (!isAuthenticated) {
          router.replace('/login?redirect=/checkout');
        } else if (selectedCartItems.length === 0) {
          router.replace('/cart');
        }
    }, 100); 

    return () => clearTimeout(checkAuth);
  }, [isAuthenticated, selectedCartItems.length, router]);

  if (!isAuthenticated || selectedCartItems.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  // ====================================================================
  // REVISI UTAMA: Gunakan selector dari store untuk kalkulasi
  // ====================================================================
  const { subtotal, taxAmount } = getSummary();
  const shippingCost = selectedShippingOption?.price || 0;
  const totalAmount = subtotal + taxAmount + shippingCost;
  // ====================================================================

  return (
    <div className="bg-gray-100 min-h-screen pt-28">
      <div className="container mx-auto px-4">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold text-gray-800 mb-8 font-playfair"
        >
          Checkout
        </motion.h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2"
          >
            <AddressForm 
              onShippingSelect={setSelectedShippingOption}
              selectedAddress={selectedAddress}
              setSelectedAddress={setSelectedAddress}
            />
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1"
          >
             <OrderSummary 
               // Kirim semua rincian biaya yang sudah dihitung ke komponen OrderSummary
               subtotal={subtotal}
               taxAmount={taxAmount}
               shippingCost={shippingCost}
               totalAmount={totalAmount}
               selectedAddress={selectedAddress}
               selectedShippingOption={selectedShippingOption}
             />
          </motion.div>

        </div>
      </div>
    </div>
  );
}