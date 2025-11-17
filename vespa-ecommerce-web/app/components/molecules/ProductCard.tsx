'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Heart, ShoppingCart } from 'lucide-react';
import { useRouter } from 'next/navigation';

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

    const imageUrl = product.images?.[0]?.url || '/product-placeholder.jpg';
    const isProductInWishlist = isWishlisted(product.id);

    return (
        <Card className="group w-full h-full overflow-hidden rounded-lg shadow-sm hover:shadow-xl transition-shadow duration-300 flex flex-col border-gray-200">
            <Link href={`/products/${product.id}`} aria-label={product.name} className="flex flex-col h-full">
                <div className="relative">
                    <button
                        onClick={handleToggleWishlist}
                        aria-label="Tambah ke wishlist"
                        className="absolute top-3 right-3 z-10 p-1.5 bg-white/70 rounded-full backdrop-blur-sm transition-all hover:bg-white hover:scale-110"
                    >
                        <Heart className={cn(
                            "w-5 h-5 transition-colors",
                            isProductInWishlist
                                ? 'fill-red-500 text-red-500'
                                : 'text-gray-600 hover:fill-red-500 hover:text-red-500'
                        )} />
                    </button>
                    <div className="aspect-square w-full overflow-hidden">
                        <motion.div
                            style={{ backgroundImage: `url(${imageUrl})` }}
                            className="w-full h-full bg-cover bg-center bg-no-repeat"
                            whileHover={{ scale: 1.05 }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                        />
                    </div>
                </div>

                <div className="p-3 flex flex-col flex-grow">
                    <div className="flex items-center justify-between">
                        <div className="flex-shrink-0">
                            {product.brand?.logoUrl ? (
                                <img 
                                    src={product.brand.logoUrl} 
                                    alt={product.brand.name || 'Brand'} 
                                    className="h-6 object-contain"
                                />
                            ) : product.brand?.name ? (
                                <span className="text-xs font-semibold text-gray-500">{product.brand.name}</span>
                            ) : null}
                        </div>
                        <div className="text-right">
                            {product.category && (
                                <p className="text-xs text-gray-500">{product.category.name}</p>
                            )}
                            {product.sku && (
                                <p className="text-[11px] text-gray-400">{product.sku}</p>
                            )}
                        </div>
                    </div>
                    
                    <div className="min-h-[40px] my-1 flex items-center">
                        <h3 className="text-base font-semibold text-black group-hover:text-[#f04e23] transition-colors line-clamp-2 leading-tight" title={product.name}>
                            {product.name}
                        </h3>
                    </div>

                    <div className="mt-auto">
                       <div className="flex items-end justify-between gap-2">
                            <PriceDisplay priceInfo={product.priceInfo} />
                            <button
                                onClick={handleAddToCart}
                                aria-label="Tambah ke keranjang"
                                className="flex-shrink-0 p-2 bg-[#f04e23] text-white rounded-lg hover:bg-[#d43d1a] transition-colors shadow-md hover:shadow-lg"
                            >
                                <ShoppingCart className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </Link>
        </Card>
    );
}