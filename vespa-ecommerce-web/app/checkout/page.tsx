// app/checkout/page.tsx

'use client';

import { useCartStore } from '@/store/cart';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { Loader2, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { AddressForm } from './_components/AddressForm';
import { OrderSummary } from './_components/OrderSummary';
import { Address } from '@/services/addressService';
import { ShippingRate } from '@/services/shippingService';
import { Button } from '@/components/ui/button';
import { getVatPercentage } from '@/services/settingsService';

export default function CheckoutPage() {
    const { cart, selectedItems } = useCartStore();
    const { isAuthenticated } = useAuthStore();
    const router = useRouter();

    const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
    const [selectedShippingOption, setSelectedShippingOption] = useState<ShippingRate | null>(null);
    const [vatPercentage, setVatPercentage] = useState(0);
    const [isAuthChecking, setIsAuthChecking] = useState(true);

    const selectedCartItems =
        cart?.items?.filter((item) => selectedItems.has(item.id)) || [];

    useEffect(() => {
        const fetchVat = async () => {
            const vat = await getVatPercentage();
            setVatPercentage(vat);
        };

        fetchVat();

        const checkAuth = setTimeout(() => {
            if (!isAuthenticated) {
                router.replace('/login?redirect=/checkout');
            } else if (selectedCartItems.length === 0) {
                router.replace('/cart');
            }

            setIsAuthChecking(false);
        }, 300); // sedikit lebih lama biar transisi halus

        return () => clearTimeout(checkAuth);
    }, [isAuthenticated, selectedCartItems.length, router]);

    const { subtotal, taxAmount, shippingCost, totalAmount } = useMemo(() => {
        const currentSubtotal = selectedCartItems.reduce(
            (total, item) =>
                total + Number(item.product.price) * item.quantity,
            0
        );
        const currentTaxAmount = (currentSubtotal * vatPercentage) / 100;
        const currentShippingCost = selectedShippingOption?.price || 0;
        const currentTotalAmount =
            currentSubtotal + currentTaxAmount + currentShippingCost;

        return {
            subtotal: currentSubtotal,
            taxAmount: currentTaxAmount,
            shippingCost: currentShippingCost,
            totalAmount: currentTotalAmount,
        };
    }, [selectedCartItems, vatPercentage, selectedShippingOption]);

    // Sambil cek auth / redirect ke login / cart, tampilkan loader
    if (isAuthChecking || !isAuthenticated || selectedCartItems.length === 0) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-100">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key="checkout-page"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="bg-gray-100 min-h-screen"
            >
                <div className="container mx-auto px-4">
                    <div className="relative mb-8 flex items-center justify-center">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                        >
                            <Button
                                onClick={() => router.back()}
                                variant="ghost"
                                className="absolute left-0 -ml-4 text-gray-600 hover:text-gray-900"
                            >
                                <ArrowLeft className="mr-2 h-5 w-5" />
                                Kembali
                            </Button>
                        </motion.div>
                        <motion.h1
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-3xl font-bold text-gray-800 font-playfair"
                        >
                            Checkout
                        </motion.h1>
                    </div>

                    <div className="max-w-4xl mx-auto lg:max-w-none">
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
                                    subtotal={subtotal}
                                    taxAmount={taxAmount}
                                    shippingCost={shippingCost}
                                    totalAmount={totalAmount}
                                    selectedAddress={selectedAddress}
                                    selectedShippingOption={selectedShippingOption}
                                    vatPercentage={vatPercentage}
                                />
                            </motion.div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
