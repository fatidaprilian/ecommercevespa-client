'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Heart, ShoppingCart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import { Card } from '@/components/ui/card';
import { Product } from '@/types';
import { useCartStore } from '@/store/cart';
import { useWishlistStore } from '@/store/wishlist';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';
import PriceDisplay from './PriceDisplay';

interface ProductCardProps {
    product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
    const { addItem } = useCartStore();
    const { isAuthenticated } = useAuthStore();
    const { toggleWishlist, isWishlisted } = useWishlistStore();
    const router = useRouter();

    // 1. Cek apakah stok habis
    const isOutOfStock = product.stock <= 0;

    const handleAddToCart = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();

        // 2. Cegah add to cart jika stok habis
        if (isOutOfStock) return;

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

    const imageUrl = product.images?.[0]?.url;
    const isProductInWishlist = isWishlisted(product.id);

    return (
        <Card
            className={cn(
                "group w-full h-full flex flex-col bg-white border-gray-200 overflow-hidden",
                // Mobile: styling dasar
                "rounded-lg shadow-sm",
                // Desktop: hover effects
                "sm:rounded-lg sm:hover:shadow-xl transition-shadow duration-300",
                // Opsional: Beri efek opacity sedikit jika stok habis biar terlihat inactive
                isOutOfStock && "opacity-90"
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
                        // Disable hover effect jika out of stock
                        whileHover={isOutOfStock ? {} : { scale: 1.05 }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                    >
                        {imageUrl && (
                            <Image
                                src={imageUrl}
                                alt={product.name}
                                fill
                                className={cn(
                                    "object-cover object-center",
                                    // Bikin gambar agak grayscale kalau habis
                                    isOutOfStock && "grayscale-[0.5]"
                                )}
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                        )}
                        
                        {/* Opsional: Label Habis di atas gambar */}
                        {isOutOfStock && (
                            <div className="absolute inset-0 bg-black/5 flex items-center justify-center">
                                <span className="bg-black/60 text-white text-[10px] sm:text-xs font-bold px-2 py-1 rounded">Habis</span>
                            </div>
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
                                <div className="relative h-3 sm:h-5 w-12">
                                    <Image 
                                        src={product.brand.logoUrl} 
                                        alt={product.brand.name || 'Brand'} 
                                        fill
                                        className="object-contain object-left"
                                        sizes="50px"
                                    />
                                </div>
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
                            className={cn(
                                "text-sm sm:text-base font-semibold transition-colors line-clamp-2 leading-tight",
                                // Jika stok habis, warna teks nama produk jadi abu-abu
                                isOutOfStock ? "text-gray-500" : "text-black group-hover:text-[#f04e23]"
                            )}
                            title={product.name}
                        >
                            {product.name}
                        </h3>
                    </div>

                    {/* Footer: Harga & Tombol */}
                    <div className="mt-auto pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                            {/* LOGIKA GANTI TAMPILAN HARGA */}
                            {isOutOfStock ? (
                                <span className="text-sm sm:text-base font-bold truncate text-gray-400 italic">
                                    Out of Stock
                                </span>
                            ) : (
                                <PriceDisplay 
                                    priceInfo={product.priceInfo} 
                                    className="text-sm sm:text-lg font-bold truncate text-gray-900" 
                                />
                            )}
                        </div>
                        
                        <button
                            onClick={handleAddToCart}
                            disabled={isOutOfStock} // Disable tombol
                            aria-label={isOutOfStock ? "Stok habis" : "Tambah ke keranjang"}
                            className={cn(
                                "flex-shrink-0 p-1.5 sm:p-2 rounded-md sm:rounded-lg transition-colors shadow-md",
                                // LOGIKA GANTI WARNA TOMBOL
                                isOutOfStock 
                                    ? "bg-gray-100 text-gray-300 cursor-not-allowed shadow-none" // Style saat habis (abu terang)
                                    : "bg-[#f04e23] text-white hover:bg-[#d43d1a] hover:shadow-lg active:scale-95" // Style normal
                            )}
                        >
                            <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                    </div>
                </div>
            </Link>
        </Card>
    );
}