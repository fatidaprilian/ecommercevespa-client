// app/profile/(dashboard)/akun-saya/wishlist/page.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Heart, Loader2 } from 'lucide-react';
import { ProductCard } from '@/components/molecules/ProductCard';
import { getWishlist, WishlistItem } from '@/services/wishlistService';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function WishlistPage() {
  const { data: wishlistItems, isLoading, isError } = useQuery<WishlistItem[], Error>({
    queryKey: ['my-wishlist'],
    queryFn: getWishlist,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }
  
  if (isError) {
    return <p className="text-center text-red-500">Gagal memuat wishlist.</p>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      <div>
        <h1 className="text-4xl font-bold text-gray-800 font-playfair">
          Wishlist Saya
        </h1>
        <p className="text-lg text-gray-600 mt-1">
          Produk yang Anda simpan untuk nanti.
        </p>
      </div>

      {wishlistItems && wishlistItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlistItems.map((item) => (
            <ProductCard key={item.id} product={item.product} />
          ))}
        </div>
      ) : (
        <div className="text-center bg-white p-12 rounded-lg shadow-md border">
            <Heart className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">
              Wishlist Anda Kosong
            </h2>
            <p className="text-gray-500 mb-6">
              Simpan produk yang Anda suka dengan menekan ikon hati.
            </p>
            <Button asChild>
              <Link href="/products">Mulai Belanja</Link>
            </Button>
        </div>
      )}
    </motion.div>
  );
}