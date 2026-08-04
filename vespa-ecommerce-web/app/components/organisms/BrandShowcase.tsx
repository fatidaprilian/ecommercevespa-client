'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useBrands } from '@/hooks/use-brands';
import { Brand } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { useRef, useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Removed Embla Carousel imports, using native CSS scroll for better mobile UX

// Komponen Skeleton untuk loading state (tidak berubah)
const BrandsSkeleton = () => (
    <div className="flex justify-center">
        <div className="flex items-center justify-center gap-8 md:gap-12">
            {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-24 bg-gray-200" />
            ))}
        </div>
    </div>
);

export function BrandShowcase() {
    // Hook untuk mengambil data tetap sama
    const { data: brandsResponse, isLoading, error } = useBrands({ limit: 12 }); // Ambil lebih banyak brand untuk carousel
    const brands = brandsResponse?.data;

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const checkScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
            setCanScrollLeft(scrollLeft > 0);
            // Memberikan sedikit toleransi 2px untuk pembulatan zoom browser
            setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth - 2);
        }
    };

    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [brands]);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = scrollContainerRef.current.clientWidth * 0.75;
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    if (error) {
        console.error("Failed to fetch brands:", error);
        return null;
    }
    
    if (!isLoading && (!brands || brands.length === 0)) {
        return null;
    }

    return (
        <section className="bg-white py-2 md:py-4 border-b border-gray-200">
            <div className="container mx-auto px-4">
                {isLoading ? <BrandsSkeleton /> : (
                    // Gunakan native CSS scroll untuk performa dan UX mobile yang jauh lebih baik (anti freeze)
                    <div className="relative">
                        {/* Faded edges to indicate scrollability */}
                        <div className="absolute right-0 top-0 bottom-0 w-12 md:w-24 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
                        
                        {/* Symmetrically Aligned Desktop Arrows */}
                        <Button
                            variant="outline"
                            size="icon"
                            className={cn(
                                "hidden md:flex absolute top-1/2 left-0 md:left-1 -translate-y-1/2 z-20 rounded-full size-9 bg-white border border-gray-200 shadow-md text-gray-700 hover:bg-gray-100 hover:text-black transition-all",
                                !canScrollLeft && "opacity-30 pointer-events-none"
                            )}
                            onClick={() => scroll('left')}
                            disabled={!canScrollLeft}
                        >
                            <ArrowLeft className="size-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className={cn(
                                "hidden md:flex absolute top-1/2 right-0 md:right-1 -translate-y-1/2 z-20 rounded-full size-9 bg-white border border-gray-200 shadow-md text-gray-700 hover:bg-gray-100 hover:text-black transition-all",
                                !canScrollRight && "opacity-30 pointer-events-none"
                            )}
                            onClick={() => scroll('right')}
                            disabled={!canScrollRight}
                        >
                            <ArrowRight className="size-4" />
                        </Button>

                        <div 
                            ref={scrollContainerRef}
                            onScroll={checkScroll}
                            className="flex overflow-x-auto gap-8 md:gap-12 snap-x snap-mandatory py-2 hide-scrollbar w-full items-center px-4 md:px-14"
                        >
                            {brands?.map((brand: Brand) => (
                                <Link
                                    key={brand.id}
                                    href={`/products?brandId=${brand.id}`}
                                    title={`Lihat produk dari ${brand.name}`}
                                    className="snap-start shrink-0 basis-[30%] sm:basis-[22%] md:basis-[15%] lg:basis-[10%] block grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300 transform hover:scale-110"
                                >
                                    {brand.logoUrl ? (
                                        <div className="relative h-10 md:h-12 w-full">
                                            <Image
                                                src={brand.logoUrl}
                                                alt={`${brand.name} logo`}
                                                fill
                                                className="object-contain pointer-events-none"
                                                sizes="(max-width: 768px) 100px, 150px"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-10 md:h-12 flex items-center justify-center px-2">
                                            <span className="text-sm font-semibold text-gray-500 text-center">{brand.name}</span>
                                        </div>
                                    )}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <style jsx global>{`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </section>
    );
}