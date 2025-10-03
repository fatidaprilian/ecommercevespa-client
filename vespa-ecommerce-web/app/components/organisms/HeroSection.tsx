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
} from '@/components/ui/carousel';
import { useBanners } from '@/hooks/use-banners';
import { Skeleton } from '@/components/ui/skeleton';

const HeroCarousel = () => {
  const { data: banners, isLoading } = useBanners();

  const heroItems = banners?.filter((b) => b.type === 'HERO') || [];

  if (isLoading) {
    return (
      <section className="w-full relative overflow-hidden">
        <Skeleton className="w-full h-56 md:h-96 lg:h-[500px]" />
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
          {heroItems.map((item, index) => (
            <CarouselItem key={item.id} className="pl-0 basis-full md:basis-[85%] lg:basis-[80%]">
              <Link href={item.linkUrl || '#'}>
                <div className="relative w-full h-56 md:h-96 lg:h-[500px]">
                  <Image
                    src={item.imageUrl}
                    alt={item.title || 'Promotional Banner'}
                    fill
                    className="object-cover" 
                    priority={index === 0}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
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
                </div>
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="absolute top-1/2 -translate-y-1/2 left-4 md:left-[4%] lg:left-[7%] hidden md:flex text-white border-white/30 bg-black/20 hover:bg-black/40" />
        <CarouselNext className="absolute top-1/2 -translate-y-1/2 right-4 md:right-[5%] lg:right-[8%] hidden md:flex text-white border-white/30 bg-black/20 hover:bg-black/40" />
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