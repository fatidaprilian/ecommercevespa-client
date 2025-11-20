'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Heart, ShoppingCart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image'; // <--- Import Image

import { Card } from '@/components/ui/card';
import { Product } from '@/types';
import { useCartStore } from '@/store/cart';
import { useWishlistStore } from '@/store/wishlist';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';
import PriceDisplay from './PriceDisplay';
import cloudinaryLoader from '@/lib/cloudinaryLoader';

interface ProductCardProps {
    product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
    const { addItem } = useCartStore();
    const { isAuthenticated } = useAuthStore();
    const { toggleWishlist, isWishlisted } = useWishlistStore();
    const router = useRouter();

    const handleAddToCart = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            addItem(product.id, 1);
            toast.success(`${product.name} berhasil ditambahkan!`);
        } catch (error) {
            console.error("Gagal dari ProductCard:", error);
        }
    };

    const handleToggleWishlist = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isAuthenticated) {
            toast.error("Login untuk menambahkan ke wishlist.");
            router.push('/login');
            return;
        }
        toggleWishlist(product.id);
    };

    // REVISI: Hapus fallback placeholder agar tidak muncul gambar pecah
    const imageUrl = product.images?.[0]?.url;
    const isProductInWishlist = isWishlisted(product.id);

    return (
        <Card
            className={cn(
                "group w-full h-full flex flex-col bg-white border-gray-200 overflow-hidden",
                // Mobile: styling dasar
                "rounded-lg shadow-sm",
                // Desktop: hover effects
                "sm:rounded-lg sm:hover:shadow-xl transition-shadow duration-300"
            )}
        >
            <Link
                href={`/products/${product.id}`}
                aria-label={product.name}
                className="flex flex-col h-full"
            >
                {/* --- Bagian Gambar --- */}
                <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
                    <button
                        onClick={handleToggleWishlist}
                        aria-label="Tambah ke wishlist"
                        className="absolute top-2 right-2 z-10 p-1.5 sm:p-2 bg-white/70 rounded-full backdrop-blur-sm transition-all hover:bg-white hover:scale-110"
                    >
                        <Heart
                            className={cn(
                                "w-4 h-4 sm:w-5 sm:h-5 transition-colors",
                                isProductInWishlist
                                    ? 'fill-red-500 text-red-500'
                                    : 'text-gray-600 hover:fill-red-500 hover:text-red-500'
                            )}
                        />
                    </button>
                    
                    {/* Wrapper Motion */}
                    <motion.div
                        className="relative w-full h-full"
                        whileHover={{ scale: 1.05 }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                    >
                        {/* REVISI: Hanya render Image jika URL-nya ada */}
                        {imageUrl && (
                            <Image
                                src={imageUrl}
                                alt={product.name}
                                fill
                                className="object-cover object-center"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                        )}
                    </motion.div>
                </div>
                {/* ----------------------------------------- */}

                {/* --- Bagian Konten --- */}
                <div className="flex flex-col flex-grow p-2 sm:p-3">
                    {/* Brand & Kategori */}
                    <div className="flex items-center justify-between gap-2 mb-1 sm:mb-2 text-[10px] sm:text-xs text-gray-500">
                        <div className="flex-shrink-0 max-w-[50%] truncate">
                            {product.brand?.logoUrl ? (
                                // Logo brand kecil biasanya aman pakai img biasa (jarang kena blokir ISP karena ukuran kecil/svg)
                                // Tapi kalau mau diubah ke Next Image juga boleh. Untuk sekarang biarkan img agar layout tidak bergeser.
                                <img 
                                    src={product.brand.logoUrl} 
                                    alt={product.brand.name || 'Brand'} 
                                    className="h-3 sm:h-5 object-contain"
                                />
                            ) : product.brand?.name ? (
                                <span className="font-semibold truncate block">
                                    {product.brand.name}
                                </span>
                            ) : null}
                        </div>
                        
                        <div className="max-w-[50%] truncate text-right">
                            {product.category && (
                                <span className="truncate block">
                                    {product.category.name}
                                </span>
                            )}
                        </div>
                    </div>
                    
                    {/* Nama Produk */}
                    <div className="h-9 sm:h-auto min-h-[36px] sm:min-h-[40px] mb-2 flex items-start">
                        <h3
                            className="text-sm sm:text-base font-semibold text-black group-hover:text-[#f04e23] transition-colors line-clamp-2 leading-tight"
                            title={product.name}
                        >
                            {product.name}
                        </h3>
                    </div>

                    {/* Footer: Harga & Tombol */}
                    <div className="mt-auto pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                             <PriceDisplay 
                                priceInfo={product.priceInfo} 
                                className="text-sm sm:text-lg font-bold truncate text-gray-900" 
                             />
                        </div>
                        
                        <button
                            onClick={handleAddToCart}
                            aria-label="Tambah ke keranjang"
                            className="flex-shrink-0 p-1.5 sm:p-2 bg-[#f04e23] text-white rounded-md sm:rounded-lg hover:bg-[#d43d1a] transition-colors shadow-md hover:shadow-lg active:scale-95"
                        >
                            <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                    </div>
                </div>
            </Link>
        </Card>
    );
}