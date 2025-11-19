'use client';

import { useState, useEffect } from 'react';
import { useRecentlyViewed } from '@/hooks/use-recently-viewed';
import { useProductsByIds } from '@/hooks/use-products-by-ids'; 
import { ProductCard } from '../molecules/ProductCard';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Skeleton } from '../ui/skeleton';

const RecentlyViewedSkeleton = () => (
    <div className="flex space-x-4">
        {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="min-w-0 flex-shrink-0 flex-grow-0 basis-1/2 md:basis-1/3 lg:basis-1/5 p-1">
                <div className="space-y-3">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-6 w-1/2" />
                </div>
            </div>
        ))}
    </div>
)

export const RecentlyViewed = ({ currentProductId }: { currentProductId: string }) => {
    const { getProductIds } = useRecentlyViewed();
    const [viewedProductIds, setViewedProductIds] = useState<string[]>([]);

    useEffect(() => {
        const ids = getProductIds();
        const filteredIds = ids.filter(id => id !== currentProductId);
        setViewedProductIds(filteredIds);
    }, [getProductIds, currentProductId]);

    const { products, isLoading } = useProductsByIds(viewedProductIds);

    if (!isLoading && products.length === 0) {
        return null;
    }

    return (
        <div className="py-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">Produk Yang Pernah Dilihat</h2>
            {isLoading ? <RecentlyViewedSkeleton /> : (
                <Carousel
                    opts={{ align: "start", loop: false }}
                    className="w-full"
                >
                    <CarouselContent>
                        {products.map((product) => (
                            /* PERUBAHAN DI SINI:
                                basis-1/2 -> Membuat item mengambil 50% lebar layar (2 item per view) di Mobile.
                                md:basis-1/3 -> 3 item per view di Tablet.
                                lg:basis-1/5 -> 5 item per view di Desktop (tetap).
                            */
                            <CarouselItem key={product.id} className="basis-1/2 md:basis-1/3 lg:basis-1/5">
                                <div className="p-1">
                                    <ProductCard product={product} />
                                </div>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    {/* Tombol panah disembunyikan di mobile agar tidak menutupi produk, muncul di md ke atas */}
                    <CarouselPrevious className="hidden md:flex ml-12" />
                    <CarouselNext className="hidden md:flex mr-12" />
                </Carousel>
            )}
        </div>
    );
};