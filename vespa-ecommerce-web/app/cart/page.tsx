// file: vespa-ecommerce-web/app/cart/page.tsx
'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Trash2, Plus, Minus, CheckSquare, Square, ArrowRight, Loader2 } from 'lucide-react';
import { useEffect } from 'react';

import { useCartStore } from '@/store/cart';
import { useAuthStore } from '@/store/auth';

// Komponen UI
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import PriceDisplay from '@/components/molecules/PriceDisplay';

// ✅ PERBAIKAN: Fungsi formatPrice dikembalikan
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(price);
};

export default function CartPage() {
  const { cart, isLoading, updateItemQuantity, removeItem, selectedItems, toggleItemSelected, toggleSelectAll, fetchCart } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    }
  }, [isAuthenticated, fetchCart]);
  
  const items = cart?.items || [];
  const isAllSelected = items.length > 0 && selectedItems.size === items.length;
  const selectedCartItems = items.filter(item => selectedItems.has(item.id));
  const totalSelectedItems = selectedCartItems.reduce((total, item) => total + item.quantity, 0);

  // Kalkulasi total harga berdasarkan priceInfo untuk akurasi diskon
  const totalSelectedPrice = selectedCartItems.reduce((total, item) => {
      const finalPrice = item.product.priceInfo?.finalPrice || item.product.price;
      return total + finalPrice * item.quantity;
  }, 0);

  // Tampilan jika belum login
  if (!isAuthenticated) {
    return (
        <div className="text-center bg-white p-12 rounded-lg shadow-md mt-28 container mx-auto">
            <ShoppingBag className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">Keranjang Anda Menunggu</h2>
            <p className="text-gray-500 mb-6">Silakan login untuk melihat keranjang belanja Anda.</p>
            <Button asChild size="lg">
                <Link href="/login">Login</Link>
            </Button>
        </div>
    );
  }
  
  // Tampilan loading
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  // Tampilan jika keranjang kosong
  if (items.length === 0) {
     return (
      <div className="text-center bg-white p-12 rounded-lg shadow-md mt-28 container mx-auto">
        <ShoppingBag className="mx-auto h-16 w-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">Keranjang Anda Kosong</h2>
        <p className="text-gray-500 mb-6">Sepertinya Anda belum menambahkan produk apa pun.</p>
        <Button asChild size="lg">
            <Link href="/products">Mulai Belanja</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pt-28">
      <div className="container mx-auto px-4 py-12">
        <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-gray-800 mb-8 font-playfair"
        >
            Keranjang Belanja
        </motion.h1>
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Daftar Item */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="w-full lg:w-2/3 bg-white rounded-xl shadow-md border">
            <div className="p-6 flex items-center justify-between border-b">
                <button onClick={() => toggleSelectAll()} className="flex items-center gap-3 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors">
                  {isAllSelected ? <CheckSquare className="text-primary h-5 w-5" /> : <Square className="h-5 w-5 text-gray-400" />}
                  <span>Pilih Semua Produk</span>
                </button>
            </div>
            
            <div className="divide-y">
              <AnimatePresence>
                {items.map(({ id: cartItemId, product, quantity }) => (
                  <motion.div 
                    key={cartItemId} 
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                    className="p-6 flex items-start gap-4"
                  >
                    <button onClick={() => toggleItemSelected(cartItemId)} className="mt-8">
                      {selectedItems.has(cartItemId) ? <CheckSquare className="text-primary h-6 w-6"/> : <Square className="h-6 w-6 text-gray-300" />}
                    </button>
                    <img src={product.images?.[0]?.url || 'https://placehold.co/100x100'} alt={product.name} className="w-24 h-24 object-cover rounded-lg border" />
                    <div className="flex flex-col justify-between flex-grow h-24">
                        <div>
                            <h3 className="font-semibold text-lg text-gray-800 leading-tight">{product.name}</h3>
                            <PriceDisplay priceInfo={product.priceInfo} className="text-xl" />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center border rounded-md">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateItemQuantity(cartItemId, quantity - 1)} disabled={quantity <= 1}><Minus size={14} /></Button>
                                <span className="px-4 text-sm font-semibold">{quantity}</span>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateItemQuantity(cartItemId, quantity + 1)} disabled={quantity >= product.stock}><Plus size={14} /></Button>
                            </div>
                            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-500 hover:bg-red-50" onClick={() => removeItem(cartItemId)}>
                                <Trash2 size={18} />
                            </Button>
                        </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Ringkasan Pesanan */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full lg:w-1/3">
            <div className="bg-white rounded-xl shadow-md p-6 sticky top-28 border">
              <h2 className="text-2xl font-bold border-b pb-4 mb-4 font-playfair text-gray-800">Ringkasan Belanja</h2>
              <div className="space-y-2 text-gray-600">
                <div className="flex justify-between">
                  <span>Subtotal ({totalSelectedItems} item)</span>
                  <span className="font-medium">{formatPrice(totalSelectedPrice)}</span>
                </div>
                {/* Placeholder untuk diskon jika ada */}
                <div className="flex justify-between">
                  <span>Diskon</span>
                  <span className="font-medium">—</span>
                </div>
              </div>
              <Separator className="my-4"/>
              <div className="flex justify-between font-bold text-xl text-gray-900">
                  <span>Total</span>
                  <span>{formatPrice(totalSelectedPrice)}</span>
              </div>
              <Button asChild size="lg" className={`w-full mt-6 transition-all ${selectedCartItems.length === 0 ? 'bg-gray-400 cursor-not-allowed' : ''}`} disabled={selectedCartItems.length === 0}>
                <Link href="/checkout">
                  Lanjutkan ke Checkout <ArrowRight size={20} className="ml-2"/>
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}