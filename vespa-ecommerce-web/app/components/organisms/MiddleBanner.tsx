// app/components/organisms/MiddleBanner.tsx
'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useBanners } from '@/hooks/use-banners';
import { Skeleton } from '@/components/ui/skeleton';

export function MiddleBanner() {
  const { data: banners, isLoading } = useBanners();
  const middleBanner = banners?.find((b) => b.type === 'MIDDLE');

  if (isLoading) {
    return (
      <section className="w-full py-4 md:py-6">
        <div className="container mx-auto px-4">
          <Skeleton className="w-full aspect-[16/9] sm:aspect-[2.5/1] md:aspect-[3/1] rounded-lg" />
        </div>
      </section>
    );
  }

  if (!middleBanner) {
    return null;
  }

  return (
    <section className="w-full py-2 md:py-4">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
        >
          <Link href={middleBanner.linkUrl || '#'} className="block group">
            <div className="relative w-full aspect-[3/1] overflow-hidden rounded-lg shadow-sm border border-gray-200/80 bg-gray-100">
              <Image
                src={middleBanner.imageUrl}
                alt={middleBanner.title}
                fill
                className="object-cover w-full h-full transition-transform duration-500 ease-in-out group-hover:scale-105"
              />
              {(middleBanner.title || middleBanner.subtitle) ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                  <div className="text-center text-white p-4">
                    {middleBanner.title && <h2 className="text-3xl md:text-5xl font-bold drop-shadow-md">{middleBanner.title}</h2>}
                    {middleBanner.subtitle && <p className="text-lg md:text-xl mt-2 drop-shadow-md">{middleBanner.subtitle}</p>}
                  </div>
                </div>
              ) : null}
            </div>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}