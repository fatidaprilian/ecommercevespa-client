// app/components/organisms/HeroSection.tsx
'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  CarouselDots,
} from '@/components/ui/carousel';
import { useBanners } from '@/hooks/use-banners';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';

const HeroCarousel = () => {
  const { data: banners, isLoading } = useBanners();

  const heroItems = banners?.filter((b) => b.type === 'HERO') || [];

  // Duplikasi items jika kurang dari 3 untuk membuat loop bekerja
  const displayItems = useMemo(() => {
    if (heroItems.length === 0) return [];
    if (heroItems.length >= 3) return heroItems;

    // Jika 1-2 items, duplikasi sampai minimal 3x
    const multiplier = Math.ceil(3 / heroItems.length);
    return Array(multiplier).fill(heroItems).flat();
  }, [heroItems]);

  if (isLoading) {
    return (
      <section className="w-full relative overflow-hidden">
        <Skeleton className="w-full aspect-[3/1] max-w-[80%] mx-auto" />
      </section>
    );
  }

  if (heroItems.length === 0) {
    return null; // Atau tampilkan gambar default
  }

  return (
    <section className="w-full relative overflow-hidden">
      <Carousel opts={{ loop: true, align: 'center' }} className="w-full">
        <CarouselContent>
          {displayItems.map((item, index) => (
            <CarouselItem key={`${item.id}-${index}`} className="pl-0 basis-full max-w-[1206px]">
              <Link href={item.linkUrl || '#'}>
                <div className="relative w-full aspect-[3/1]">
                  <Image
                    src={item.imageUrl}
                    alt={item.title || 'Promotional Banner'}
                    fill
                    sizes="(max-width: 768px) 100vw, 1206px"
                    className="object-cover"
                    priority={index === 0}
                  />
                  {item.title || item.subtitle ? (
                    <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 text-white">
                      <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="text-sm md:text-base font-semibold text-gray-200"
                      >
                        {item.subtitle}
                      </motion.p>
                      <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="text-2xl md:text-4xl font-bold mt-1"
                      >
                        {item.title}
                      </motion.h2>
                    </div>
                  ) : null}
                </div>
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>

        {/* Navigation Arrows & Dots - Symmetrically Aligned (Best Practice) */}
        <CarouselPrevious className="hidden md:flex absolute top-1/2 left-4 md:left-6 -translate-y-1/2 z-20 text-white border-white/30 bg-black/40 hover:bg-black/70 size-9 md:size-10 shadow-lg backdrop-blur-sm transition-all" />
        <CarouselNext className="hidden md:flex absolute top-1/2 right-4 md:right-6 -translate-y-1/2 z-20 text-white border-white/30 bg-black/40 hover:bg-black/70 size-9 md:size-10 shadow-lg backdrop-blur-sm transition-all" />
        <CarouselDots className="absolute bottom-4 left-0 right-0 z-10 flex justify-center gap-1.5" />
      </Carousel>
    </section>
  );
};

export function HeroSection() {
  return (
    <>
      <HeroCarousel />
    </>
  );
}