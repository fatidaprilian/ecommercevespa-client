'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useBanners } from '@/hooks/use-banners';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export function AboutJssBanner() {
  const { data: banners, isLoading } = useBanners();
  const bottomBanner = banners?.find((b) => b.type === 'BOTTOM');

  if (isLoading) {
    return (
      <section className="w-full py-3 md:py-6 bg-white">
        <div className="container mx-auto px-4">
          <Skeleton className="w-full h-56 md:h-80 lg:h-96 rounded-xl" />
        </div>
      </section>
    );
  }

  if (!bottomBanner || !bottomBanner.imageUrl) {
    return null;
  }

  const bgImage = bottomBanner.imageUrl;
  const buttonText = bottomBanner?.buttonText?.trim();
  const linkUrl = bottomBanner?.linkUrl || '/about';
  const buttonColor = bottomBanner?.buttonColor || '#1f2937';
  const textColor = bottomBanner?.textColor || '#FFFFFF';
  const isButtonTransparent = buttonColor === 'transparent';

  // Priority: if admin explicitly set textColor, use it. Otherwise use smart contrast
  const getButtonTextColor = () => {
    if (bottomBanner?.textColor) return bottomBanner.textColor;
    if (isButtonTransparent) return textColor;
    const hex = buttonColor.replace('#', '');
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.6 ? '#1f2937' : '#FFFFFF';
    }
    return '#FFFFFF';
  };

  const bannerContent = (
    <div className="relative w-full aspect-[16/9] sm:aspect-[2.5/1] md:aspect-[3/1] overflow-hidden rounded-xl shadow-sm border border-gray-200/80 bg-gray-100 group">
      <Image
        src={bgImage}
        alt={bottomBanner?.title || 'About JSS Banner'}
        fill
        sizes="100vw"
        className="object-cover w-full h-full"
      />

      {/* Optional Overlay Button — rendered ONLY if buttonText is filled in Admin */}
      {buttonText ? (
        <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 md:bottom-8 md:left-8 z-10">
          <Button
            asChild
            variant="outline"
            className="font-medium text-xs sm:text-sm md:text-base px-4 sm:px-6 py-1.5 sm:py-2 md:py-2.5 rounded-md shadow-md transition-all hover:opacity-90"
            style={{
              backgroundColor: isButtonTransparent ? 'transparent' : buttonColor,
              color: getButtonTextColor(),
              borderColor: isButtonTransparent ? textColor : buttonColor,
            }}
          >
            <span>{buttonText}</span>
          </Button>
        </div>
      ) : null}
    </div>
  );

  return (
    <section className="w-full py-3 md:py-6 bg-white">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
        >
          {linkUrl ? (
            <Link href={linkUrl} className="block cursor-pointer">
              {bannerContent}
            </Link>
          ) : (
            bannerContent
          )}
        </motion.div>
      </div>
    </section>
  );
}
