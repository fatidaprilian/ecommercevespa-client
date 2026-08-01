'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useBanners } from '@/hooks/use-banners';
import { Skeleton } from '@/components/ui/skeleton';

export function PromoBanners() {
  const { data: banners, isLoading } = useBanners();

  const topLeftBanner = banners?.find((b) => b.type === 'TOP_LEFT');
  const topRightBanner = banners?.find((b) => b.type === 'TOP_RIGHT');

  if (isLoading) {
    return (
      <section className="w-full py-3 md:py-6 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 gap-3 md:gap-6">
            <Skeleton className="w-full aspect-[4/3] md:aspect-[16/9] rounded-lg md:rounded-xl" />
            <Skeleton className="w-full aspect-[4/3] md:aspect-[16/9] rounded-lg md:rounded-xl" />
          </div>
        </div>
      </section>
    );
  }

  const promoList = [topLeftBanner, topRightBanner].filter(Boolean);

  if (promoList.length === 0) {
    return null;
  }

  return (
    <section className="w-full py-3 md:py-6 bg-white">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 gap-3 md:gap-6">
          {topLeftBanner && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5 }}
            >
              <Link href={topLeftBanner.linkUrl || '#'} className="block group">
                <div className="relative w-full aspect-[4/3] md:aspect-[16/9] overflow-hidden rounded-lg md:rounded-xl shadow-sm bg-gray-100">
                  <Image
                    src={topLeftBanner.imageUrl}
                    alt={topLeftBanner.title || 'Promo Banner Left'}
                    fill
                    className="object-cover w-full h-full transition-transform duration-500 ease-in-out group-hover:scale-105"
                  />
                  {/* Overlay opsional hanya jika title disetel */}
                  {(topLeftBanner.title || topLeftBanner.subtitle) && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-3 md:p-6 text-white">
                      {topLeftBanner.title && (
                        <h3 className="text-xs sm:text-sm md:text-xl font-bold leading-snug">{topLeftBanner.title}</h3>
                      )}
                      {topLeftBanner.subtitle && (
                        <p className="hidden md:block text-xs md:text-sm text-gray-200 mt-1">{topLeftBanner.subtitle}</p>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            </motion.div>
          )}

          {topRightBanner && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Link href={topRightBanner.linkUrl || '#'} className="block group">
                <div className="relative w-full aspect-[4/3] md:aspect-[16/9] overflow-hidden rounded-lg md:rounded-xl shadow-sm bg-gray-100">
                  <Image
                    src={topRightBanner.imageUrl}
                    alt={topRightBanner.title || 'Promo Banner Right'}
                    fill
                    className="object-cover w-full h-full transition-transform duration-500 ease-in-out group-hover:scale-105"
                  />
                  {/* Overlay opsional hanya jika title disetel */}
                  {(topRightBanner.title || topRightBanner.subtitle) && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-3 md:p-6 text-white">
                      {topRightBanner.title && (
                        <h3 className="text-xs sm:text-sm md:text-xl font-bold leading-snug">{topRightBanner.title}</h3>
                      )}
                      {topRightBanner.subtitle && (
                        <p className="hidden md:block text-xs md:text-sm text-gray-200 mt-1">{topRightBanner.subtitle}</p>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
