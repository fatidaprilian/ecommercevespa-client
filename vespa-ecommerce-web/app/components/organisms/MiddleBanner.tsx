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
        <section className="w-full py-8 md:py-12">
            <div className="container mx-auto px-0">
                <Skeleton className="w-full h-56 md:h-80 lg:h-96" />
            </div>
        </section>
    )
  }

  if (!middleBanner) {
    return null; // Jangan tampilkan apa-apa jika tidak ada banner tengah yang aktif
  }

  return (
    <section className="w-full py-2 md:py-4">
      <div className="container mx-auto px-0"> {/* px-0 untuk full-width di container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
        >
          <Link href={middleBanner.linkUrl || '#'} className="block group">
            <div className="relative w-full h-56 md:h-80 lg:h-96 overflow-hidden">
              <Image
                src={middleBanner.imageUrl}
                alt={middleBanner.title}
                fill
                className="object-cover w-full h-full transition-transform duration-500 ease-in-out group-hover:scale-105"
              />
               <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white p-4">
                        <h2 className="text-3xl md:text-5xl font-bold">{middleBanner.title}</h2>
                        {middleBanner.subtitle && <p className="text-lg md:text-xl mt-2">{middleBanner.subtitle}</p>}
                    </div>
               </div>
            </div>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}