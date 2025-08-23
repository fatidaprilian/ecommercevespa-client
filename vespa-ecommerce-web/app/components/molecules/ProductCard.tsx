// file: app/components/molecules/ProductCard.tsx (Revisi Final)

'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShoppingCart, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/types';
import { useCartStore } from '@/store/cart';
import PriceDisplay from './PriceDisplay';

interface ProductCardProps {
    product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
    const { addItem } = useCartStore();

    const handleAddToCart = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault(); 
        e.stopPropagation(); 
        try {
            await addItem(product.id, 1);
            toast.success(`${product.name} berhasil ditambahkan!`);
        } catch (error) {
            console.error("Gagal dari ProductCard:", error);
        }
    };

    const imageUrl = product.images?.[0]?.url || 'https://images.unsplash.com/photo-1600727032952-52f683078a17?q=80&w=1287&auto=format&fit=crop';

    return (
        <Card className="group w-full h-full overflow-hidden rounded-lg shadow-sm hover:shadow-xl transition-shadow duration-300 flex flex-col border-gray-200 p-0">
            {/* [DIUBAH] Menghapus `border-b` dari CardHeader */}
            <CardHeader className="p-0 relative">
                <Link href={`/products/${product.id}`} aria-label={product.name} className="block">
                    <div className="aspect-square w-full overflow-hidden">
                        <motion.div
                            style={{ backgroundImage: `url(${imageUrl})` }}
                            className="w-full h-full bg-cover bg-center bg-no-repeat"
                            whileHover={{ scale: 1.1 }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                        />
                    </div>
                </Link>

                {product.category && (
                    <Badge variant="secondary" className="absolute top-3 left-3 pointer-events-none bg-white/80 backdrop-blur-sm">
                        {product.category.name}
                    </Badge>
                )}

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                    <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm p-1.5 rounded-full shadow-lg">
                         <Button
                             size="icon"
                             variant="ghost"
                             className="rounded-full h-9 w-9 text-gray-700 hover:bg-gray-200"
                             onClick={handleAddToCart}
                             aria-label="Tambah ke keranjang"
                         >
                             <ShoppingCart className="h-5 w-5" />
                         </Button>
                         <Button
                             asChild
                             size="icon"
                             variant="ghost"
                             className="rounded-full h-9 w-9 text-gray-700 hover:bg-gray-200"
                             aria-label="Lihat detail produk"
                         >
                             <Link href={`/products/${product.id}`}>
                                 <Eye className="h-5 w-5" />
                             </Link>
                         </Button>
                    </div>
                </div>
            </CardHeader>
            
            <Link href={`/products/${product.id}`} className="flex flex-col flex-grow bg-white">
                <CardContent className="p-4 flex-grow w-full">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-grow">
                            <h3 className="font-bold text-md text-gray-900 group-hover:text-primary transition-colors line-clamp-2" title={product.name}>
                                {product.name}
                            </h3>
                        </div>
                        <div className="flex-shrink-0">
                            {product.brand?.logoUrl ? (
                                <img 
                                    src={product.brand.logoUrl} 
                                    alt={product.brand.name || 'Brand Logo'} 
                                    className="h-10 w-10 object-contain"
                                />
                            ) : product.brand?.name ? (
                                <span className="text-xs font-semibold text-gray-500">{product.brand.name}</span>
                            ) : null}
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="p-4 pt-0 mt-auto">
                    <div className="w-full">
                       <PriceDisplay priceInfo={product.priceInfo} />
                    </div>
                </CardFooter>
            </Link>
        </Card>
    );
}