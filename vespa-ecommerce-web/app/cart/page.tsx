// /app/cart/page.tsx
'use client';

import { useCartStore } from '@/store/cart';
import Link from 'next/link';
import { ShoppingBag, Trash2, Plus, Minus } from 'lucide-react';

// Helper untuk format harga
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(price);
};

export default function CartPage() {
  const { items, totalItems, totalPrice, updateQuantity, removeItem, clearCart } = useCartStore();

  return (
    <div className="bg-gray-100 min-h-screen pt-28">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Keranjang Belanja</h1>

        {items.length === 0 ? (
          <div className="text-center bg-white p-12 rounded-lg shadow-md">
            <ShoppingBag className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">Keranjang Anda Kosong</h2>
            <p className="text-gray-500 mb-6">Sepertinya Anda belum menambahkan produk apa pun.</p>
            <Link href="/products" className="bg-[#52616B] text-white font-bold py-3 px-6 rounded-lg hover:bg-[#1E2022] transition-colors">
              Mulai Belanja
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Daftar Item */}
            <div className="w-full lg:w-2/3">
              <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
                {items.map(({ product, quantity }) => (
                  <div key={product.id} className="flex flex-col sm:flex-row items-center justify-between border-b pb-4 last:border-b-0">
                    <div className="flex items-center gap-4 mb-4 sm:mb-0">
                      <img src={product.images?.[0] || 'https://placehold.co/100x100'} alt={product.name} className="w-24 h-24 object-cover rounded-md" />
                      <div>
                        <h3 className="font-semibold text-lg text-gray-800">{product.name}</h3>
                        <p className="text-gray-500 text-sm">SKU: {product.sku}</p>
                        <p className="text-[#52616B] font-bold mt-1">{formatPrice(Number(product.price))}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {/* Kontrol Kuantitas */}
                      <div className="flex items-center border rounded-md">
                        <button onClick={() => updateQuantity(product.id, quantity - 1)} className="px-3 py-1 text-gray-600 hover:bg-gray-100"><Minus size={16} /></button>
                        <span className="px-4 font-semibold">{quantity}</span>
                        <button onClick={() => updateQuantity(product.id, quantity + 1)} className="px-3 py-1 text-gray-600 hover:bg-gray-100"><Plus size={16} /></button>
                      </div>
                      {/* Tombol Hapus */}
                      <button onClick={() => removeItem(product.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}
                <button onClick={clearCart} className="text-sm text-red-500 hover:underline mt-4">
                  Kosongkan Keranjang
                </button>
              </div>
            </div>

            {/* Ringkasan Pesanan */}
            <div className="w-full lg:w-1/3">
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-28">
                <h2 className="text-xl font-bold border-b pb-4 mb-4">Ringkasan Pesanan</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Subtotal ({totalItems} item)</span>
                    <span className="font-semibold">{formatPrice(totalPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Biaya Pengiriman</span>
                    <span className="font-semibold">Akan dihitung</span>
                  </div>
                </div>
                <div className="border-t mt-4 pt-4">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>{formatPrice(totalPrice)}</span>
                  </div>
                </div>
                <button className="w-full mt-6 bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-colors">
                  Lanjutkan ke Checkout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}