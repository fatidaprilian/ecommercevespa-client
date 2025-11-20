'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useBrands } from '@/hooks/use-brands';
import { Brand } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"; // 1. Import komponen Carousel

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
                    // 2. Implementasi Carousel
                    <Carousel
                        opts={{
                            align: "start",
                            loop: true,
                        }}
                        className="w-full"
                    >
                        <CarouselContent className="-ml-8">
                            {brands?.map((brand: Brand) => (
                                <CarouselItem key={brand.id} className="basis-1/3 sm:basis-1/4 md:basis-1/6 lg:basis-1/8 pl-8">
                                    <Link
                                        href={`/products?brandId=${brand.id}`}
                                        title={`Lihat produk dari ${brand.name}`}
                                        className="block grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300 transform hover:scale-110"
                                    >
                                        {brand.logoUrl ? (
                                            <div className="relative h-10 md:h-12 w-full">
                                            <Image
                                                src={brand.logoUrl}
                                                alt={`${brand.name} logo`}
                                                fill
                                                className="object-contain"
                                                sizes="(max-width: 768px) 100px, 150px"
                                            />
                                        </div>
                                        ) : (
                                            <div className="h-10 md:h-12 flex items-center justify-center px-2">
                                                <span className="text-sm font-semibold text-gray-500 text-center">{brand.name}</span>
                                            </div>
                                        )}
                                    </Link>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        <CarouselPrevious className="ml-12 flex" />
                        <CarouselNext className="mr-12 flex" />
                    </Carousel>
                )}
            </div>
        </section>
    );
}