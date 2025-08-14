// file: vespa-ecommerce-web/app/cart/page.tsx
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShoppingBag, Trash2, Plus, Minus, CheckSquare, Square, ArrowRight } from 'lucide-react';
import { useEffect } from 'react';

import { useCartStore } from '@/store/cart';
import { useAuthStore } from '@/store/auth';

// Helper untuk format harga
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
  const totalSelectedPrice = selectedCartItems.reduce((total, item) => total + Number(item.product.price) * item.quantity, 0);

  // Tampilan jika belum login
  if (!isAuthenticated) {
    return (
        <div className="text-center bg-white p-12 rounded-lg shadow-md mt-28 container mx-auto">
            <ShoppingBag className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">Keranjang Anda Menunggu</h2>
            <p className="text-gray-500 mb-6">Silakan login untuk melihat keranjang belanja Anda.</p>
            <Link href="/login" className="bg-[#52616B] text-white font-bold py-3 px-6 rounded-lg hover:bg-[#1E2022] transition-colors">
              Login
            </Link>
        </div>
    );
  }

  // Tampilan jika keranjang kosong
  if (!isLoading && items.length === 0) {
     return (
      <div className="text-center bg-white p-12 rounded-lg shadow-md mt-28 container mx-auto">
        <ShoppingBag className="mx-auto h-16 w-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">Keranjang Anda Kosong</h2>
        <p className="text-gray-500 mb-6">Sepertinya Anda belum menambahkan produk apa pun.</p>
        <Link href="/products" className="bg-[#52616B] text-white font-bold py-3 px-6 rounded-lg hover:bg-[#1E2022] transition-colors">
          Mulai Belanja
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen pt-28">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 font-playfair">Keranjang Belanja</h1>
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Daftar Item */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="w-full lg:w-2/3">
            <div className="bg-white rounded-lg shadow-md p-6 relative">
              <div className="flex items-center justify-between border-b pb-4 mb-4">
                <button onClick={() => toggleSelectAll()} className="flex items-center gap-3 text-lg font-semibold text-gray-700">
                  {isAllSelected ? <CheckSquare className="text-primary" /> : <Square />}
                  <span>Pilih Semua Produk</span>
                </button>
              </div>
              
              <div className="space-y-4">
                {items.map(({ id: cartItemId, product, quantity }) => (
                  <div key={cartItemId} className="flex items-start sm:items-center justify-between">
                    <button onClick={() => toggleItemSelected(cartItemId)} className="mr-4 mt-10 sm:mt-0">
                      {selectedItems.has(cartItemId) ? <CheckSquare className="text-primary h-6 w-6"/> : <Square className="h-6 w-6 text-gray-400" />}
                    </button>
                    <div className="flex items-center gap-4 flex-grow">
                      <img src={product.images?.[0]?.url || 'https://placehold.co/100x100'} alt={product.name} className="w-24 h-24 object-cover rounded-md" />
                      <div>
                        <h3 className="font-semibold text-lg text-gray-800">{product.name}</h3>
                        <p className="text-[#52616B] font-bold mt-1">{formatPrice(Number(product.price))}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-4 sm:mt-0">
                      <div className="flex items-center border rounded-md">
                        <button onClick={() => updateItemQuantity(cartItemId, quantity - 1)} className="px-3 py-1"><Minus size={16} /></button>
                        <span className="px-4 font-semibold">{quantity}</span>
                        <button onClick={() => updateItemQuantity(cartItemId, quantity + 1)} className="px-3 py-1"><Plus size={16} /></button>
                      </div>
                      <button onClick={() => removeItem(cartItemId)} className="text-red-500 hover:text-red-700"><Trash2 size={20} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Ringkasan Pesanan */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full lg:w-1/3">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-28">
              <h2 className="text-xl font-bold border-b pb-4 mb-4">Ringkasan Belanja</h2>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {selectedCartItems.length > 0 ? selectedCartItems.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="flex-1 truncate pr-2">{item.product.name} (x{item.quantity})</span>
                    <span className="font-medium">{formatPrice(Number(item.product.price) * item.quantity)}</span>
                  </div>
                )) : <p className="text-sm text-gray-500 text-center py-4">Pilih item untuk checkout.</p>}
              </div>
              <div className="border-t mt-4 pt-4">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total ({totalSelectedItems} item)</span>
                  <span>{formatPrice(totalSelectedPrice)}</span>
                </div>
              </div>

              {/* --- PERUBAHAN UTAMA DI SINI --- */}
              {/* Tombol sekarang menjadi Link yang membawa ke halaman checkout */}
              <Link
                href="/checkout"
                passHref
                // Gunakan pointer-events-none untuk menonaktifkan link jika tidak ada item yang dipilih
                className={`w-full mt-6 bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 ${selectedCartItems.length === 0 ? 'bg-gray-400 cursor-not-allowed pointer-events-none' : ''}`}
                aria-disabled={selectedCartItems.length === 0}
              >
                <span>Lanjutkan ke Checkout</span>
                <ArrowRight size={20}/>
              </Link>
              
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}