// app/cart/page.tsx
'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Trash2, Plus, Minus, CheckSquare, Square, ArrowRight, Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

import { useCartStore } from '@/store/cart';
import { useAuthStore } from '@/store/auth';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import PriceDisplay from '@/components/molecules/PriceDisplay';
import Image from 'next/image';

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(price);
};

export default function CartPage() {
  const { cart, isLoading, updateItemQuantity, removeItem, selectedItems, toggleItemSelected, toggleSelectAll, fetchCart } = useCartStore();
  const { isAuthenticated } = useAuthStore();

  // 👇 REVISI BAGIAN INI: Tambahkan polling interval 👇
  useEffect(() => {
    if (isAuthenticated) {
      // 1. Fetch awal saat halaman dimuat (akan menampilkan loading spinner jika belum ada data)
      fetchCart();

      // 2. Pasang interval untuk melakukan silent refresh setiap 5 detik
      // 'true' artinya mode silent (tanpa loading spinner)
      const intervalId = setInterval(() => {
        fetchCart(true);
      }, 5000);

      // 3. Bersihkan interval saat komponen di-unmount agar tidak memory leak
      return () => clearInterval(intervalId);
    }
  }, [isAuthenticated, fetchCart]);
  // 👆 AKHIR REVISI 👆

  const items = cart?.items || [];
  const isAllSelected = items.length > 0 && selectedItems.size === items.length;
  const selectedCartItems = items.filter(item => selectedItems.has(item.id));
  const totalSelectedItems = selectedCartItems.reduce((total, item) => total + item.quantity, 0);

  const totalSelectedPrice = selectedCartItems.reduce((total, item) => {
    const finalPrice = item.product.priceInfo?.finalPrice || item.product.price;
    return total + finalPrice * item.quantity;
  }, 0);

  const handleRemoveSelected = () => {
    const selectedIds = Array.from(selectedItems);
    if (window.confirm(`Anda yakin ingin menghapus ${selectedIds.length} item dari keranjang?`)) {
      const removePromises = selectedIds.map(id => removeItem(id));
      Promise.all(removePromises)
        .then(() => toast.success("Item terpilih berhasil dihapus."))
        .catch(() => toast.error("Gagal menghapus beberapa item."));
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center bg-white p-12 rounded-lg shadow-md mt-28 container mx-auto">
        <ShoppingBag className="mx-auto h-16 w-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">Keranjang Anda Menunggu</h2>
        <p className="text-gray-500 mb-6">Silakan login untuk melihat keranjang belanja Anda.</p>
        <Button asChild size="lg"><Link href="/login">Login</Link></Button>
      </div>
    );
  }

  if (isLoading && !cart) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!isLoading && items.length === 0) {
    return (
      <div className="text-center bg-white p-12 rounded-lg shadow-md mt-28 container mx-auto">
        <ShoppingBag className="mx-auto h-16 w-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">Keranjang Anda Kosong</h2>
        <p className="text-gray-500 mb-6">Sepertinya Anda belum menambahkan produk apa pun.</p>
        <Button asChild size="lg"><Link href="/products">Mulai Belanja</Link></Button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-12">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold text-gray-800 mb-8 font-playfair"
        >
          Keranjang Belanja
        </motion.h1>
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="w-full lg:w-2/3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox id="select-all" checked={isAllSelected} onCheckedChange={() => toggleSelectAll()} />
                  <label htmlFor="select-all" className="text-sm font-semibold text-gray-700 cursor-pointer">
                    Pilih Semua ({items.length} produk)
                  </label>
                </div>
                {selectedItems.size > 0 && (
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleRemoveSelected}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Hapus Terpilih
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-0 divide-y">
                <AnimatePresence>
                  {items.map(({ id: cartItemId, product, quantity }) => (
                    <motion.div
                      key={cartItemId}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -50, transition: { duration: 0.3 } }}
                      className={`flex items-start gap-4 p-6 transition-colors ${selectedItems.has(cartItemId) ? 'bg-blue-50/50' : 'bg-white'}`}
                    >
                      <Checkbox
                        className="mt-1 flex-shrink-0"
                        checked={selectedItems.has(cartItemId)}
                        onCheckedChange={() => toggleItemSelected(cartItemId)}
                      />
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 overflow-hidden rounded-lg border bg-gray-100">
                        {product.images?.[0]?.url && (
                          <Image
                            src={product.images[0].url}
                            alt={product.name}
                            fill
                            className="object-cover"
                            sizes="100px"
                          />
                        )}
                      </div>
                      <div className="flex flex-col justify-between flex-grow gap-2">
                        <div>
                          <h3 className="font-semibold text-base sm:text-lg text-gray-800 leading-tight">{product.name}</h3>
                          <PriceDisplay priceInfo={product.priceInfo} className="text-lg sm:text-xl" />
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center">
                            <Button variant="outline" size="icon" className="h-8 w-8 rounded-r-none border-r-0" onClick={() => updateItemQuantity(cartItemId, quantity - 1)} disabled={quantity <= 1}><Minus size={14} /></Button>
                            <Input
                              type="number"
                              min={1}
                              className="h-8 w-14 rounded-none text-center px-1 focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              value={quantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val) && val >= 1) {
                                  updateItemQuantity(cartItemId, val);
                                }
                              }}
                            />
                            <Button variant="outline" size="icon" className="h-8 w-8 rounded-l-none border-l-0" onClick={() => updateItemQuantity(cartItemId, quantity + 1)} disabled={quantity >= product.stock}><Plus size={14} /></Button>
                          </div>
                          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-500 hover:bg-red-50" onClick={() => removeItem(cartItemId)}>
                            <Trash2 size={18} />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full lg:w-1/3">
            <Card className="sticky top-28">
              <CardHeader>
                <h2 className="text-2xl font-bold font-playfair text-gray-800">Ringkasan Belanja</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-gray-600">
                  <div className="flex justify-between">
                    <span>Total Harga ({totalSelectedItems} item)</span>
                    <span className="font-medium">{formatPrice(totalSelectedPrice)}</span>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="flex justify-between font-bold text-xl text-gray-900">
                  <span>Total</span>
                  <span>{formatPrice(totalSelectedPrice)}</span>
                </div>
                <Button asChild size="lg" className={`w-full mt-6 text-base ${selectedCartItems.length === 0 ? 'cursor-not-allowed' : ''}`} disabled={selectedCartItems.length === 0}>
                  <Link href="/checkout">
                    Lanjutkan ke Checkout ({totalSelectedItems})
                    <ArrowRight size={18} className="ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}