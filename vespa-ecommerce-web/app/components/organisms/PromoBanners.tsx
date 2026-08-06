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
            <Skeleton className="w-full aspect-[4/3] md:aspect-[16/9] rounded-md" />
            <Skeleton className="w-full aspect-[4/3] md:aspect-[16/9] rounded-md" />
          </div>
        </div>
      </section>
    );
  }

  const promoList = [topLeftBanner, topRightBanner].filter(Boolean);

  if (promoList.length === 0) {
    return null;
  }

  const renderBanner = (banner: NonNullable<typeof topLeftBanner>, delay: number) => {
    const textColor = banner.textColor || '#FFFFFF';
    const buttonColor = banner.buttonColor || '#000000';
    const isButtonTransparent = buttonColor === 'transparent';
    const isTextTransparent = textColor === 'transparent';
    const hasOverlay = !isTextTransparent && (banner.title || banner.subtitle || banner.buttonText);

    const content = (
      <div className="relative w-full aspect-[4/3] md:aspect-[16/9] overflow-hidden rounded-none shadow-sm bg-gray-100">
        <Image
          src={banner.imageUrl}
          alt={banner.title || 'Promo Banner'}
          fill
          sizes="(max-width: 768px) 50vw, 50vw"
          className="object-cover w-full h-full transition-transform duration-500 ease-in-out group-hover:scale-105"
        />
        {/* Overlay with custom text + button */}
        {hasOverlay && (
          <div className="absolute inset-0 flex flex-col justify-end p-3 md:p-6">
            {banner.title && (
              <h3
                className="text-xs sm:text-sm md:text-xl font-bold leading-snug"
                style={{ color: textColor }}
              >
                {banner.title}
              </h3>
            )}
            {banner.subtitle && (
              <p
                className="text-[10px] sm:text-xs md:text-sm mt-0.5 md:mt-1 line-clamp-2"
                style={{ color: textColor, opacity: 0.85 }}
              >
                {banner.subtitle}
              </p>
            )}
            {banner.buttonText && (
              <div className="mt-2 md:mt-3">
                <span
                  className="inline-block text-xs md:text-sm font-medium px-3 py-1.5 md:px-4 md:py-2 rounded-md transition-opacity hover:opacity-80"
                  style={{
                    backgroundColor: isButtonTransparent ? 'transparent' : buttonColor,
                    color: isButtonTransparent ? textColor : '#FFFFFF',
                    border: isButtonTransparent ? `1px solid ${textColor}` : 'none',
                  }}
                >
                  {banner.buttonText}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5, delay }}
      >
        {banner.linkUrl ? (
          <Link href={banner.linkUrl} className="block group">
            {content}
          </Link>
        ) : (
          <div className="group">{content}</div>
        )}
      </motion.div>
    );
  };

  return (
    <section className="w-full py-3 md:py-6 bg-white">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 gap-3 md:gap-6">
          {topLeftBanner && renderBanner(topLeftBanner, 0)}
          {topRightBanner && renderBanner(topRightBanner, 0.1)}
        </div>
      </div>
    </section>
  );
}
