'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useBanners } from '@/hooks/use-banners';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Boxes, Globe2, Wrench, Calendar } from 'lucide-react';

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=1200&auto=format&fit=crop';

export function AboutJssBanner() {
  const { data: banners, isLoading } = useBanners();
  const bottomBanner = banners?.find((b) => b.type === 'BOTTOM');

  if (isLoading) {
    return (
      <section className="w-full py-6 md:py-10 bg-white">
        <div className="container mx-auto px-4">
          <Skeleton className="w-full h-72 rounded-xl" />
        </div>
      </section>
    );
  }

  const bgImage = bottomBanner?.imageUrl || PLACEHOLDER_IMAGE;
  const textColor = bottomBanner?.textColor || '#1f2937';
  const buttonColor = bottomBanner?.buttonColor || '#1f2937';
  const buttonText = bottomBanner?.buttonText || 'Selengkapnya Tentang Kami';
  const isButtonTransparent = buttonColor === 'transparent';

  // Relative luminance contrast — dark text on light buttons, white text on dark buttons
  const getButtonTextColor = () => {
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

  return (
    <section className="w-full py-6 md:py-10 bg-white">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="overflow-hidden rounded-2xl border border-gray-200/80 bg-[#f9f9f9] shadow-sm"
        >
          {/* Mobile: stacked. Desktop: 45% text / 55% image split. */}
          <div className="grid grid-cols-1 lg:grid-cols-[45%_55%]">

            {/* Image — shown first on mobile (natural DOM order), right side on desktop (order-last) */}
            <div className="relative w-full aspect-[16/9] sm:aspect-[2/1] lg:aspect-auto lg:min-h-[400px] lg:order-last">
              <Image
                src={bgImage}
                alt="Tentang JSS"
                fill
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="object-cover object-center"
              />
              {/* Mobile: bottom fade into text section. Desktop: left edge fade for seamless merge. */}
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#f9f9f9] to-transparent lg:hidden pointer-events-none" />
              <div className="hidden lg:block absolute inset-y-0 left-0 w-24 xl:w-40 bg-gradient-to-r from-[#f9f9f9] to-transparent pointer-events-none" />
            </div>

            {/* Text content */}
            <div className="p-5 sm:p-6 md:p-8 lg:p-10 flex flex-col justify-between">
              <div>
                <h2
                  className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 md:mb-3"
                  style={{ color: textColor }}
                >
                  Tentang Jakarta Scooter Shop
                </h2>
                <p
                  className="text-sm md:text-base leading-relaxed mb-4 md:mb-6 max-w-xl"
                  style={{ color: textColor, opacity: 0.85 }}
                >
                  Jakarta Scooter Shop (JSS) adalah importir dan distributor resmi spare part Vespa klasik dari berbagai merek premium asal Italia. Kami berkomitmen menyediakan produk original berkualitas tinggi untuk para pecinta dan restorator Vespa di Indonesia.
                </p>

                {/* Stats Section — Flexbox with balanced spacing and vertical dividers */}
                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-y-4 my-4 md:my-6 py-4 border-y border-gray-200">
                  <div className="flex items-center gap-2 pr-2 sm:pr-3 lg:pr-4">
                    <Boxes className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 opacity-75" style={{ color: textColor }} />
                    <div className="flex flex-col justify-center">
                      <span className="text-sm sm:text-base font-bold leading-tight tracking-tight whitespace-nowrap" style={{ color: textColor }}>
                        300+
                      </span>
                      <span className="text-[10px] sm:text-xs font-medium leading-tight opacity-80 whitespace-nowrap" style={{ color: textColor }}>
                        Merek &amp; Part
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 border-l border-gray-300/60 pl-3 sm:pl-3 lg:pl-4 pr-2 sm:pr-3 lg:pr-4">
                    <Globe2 className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 opacity-75" style={{ color: textColor }} />
                    <div className="flex flex-col justify-center">
                      <span className="text-sm sm:text-base font-bold leading-tight tracking-tight whitespace-nowrap" style={{ color: textColor }}>
                        10+
                      </span>
                      <span className="text-[10px] sm:text-xs font-medium leading-tight opacity-80 whitespace-nowrap" style={{ color: textColor }}>
                        Merek Italia
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 border-l border-gray-300/60 pl-3 sm:pl-3 lg:pl-4 pr-2 sm:pr-3 lg:pr-4">
                    <Wrench className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 opacity-75" style={{ color: textColor }} />
                    <div className="flex flex-col justify-center">
                      <span className="text-sm sm:text-base font-bold leading-tight tracking-tight whitespace-nowrap" style={{ color: textColor }}>
                        1000+
                      </span>
                      <span className="text-[10px] sm:text-xs font-medium leading-tight opacity-80 whitespace-nowrap" style={{ color: textColor }}>
                        Mitra Bengkel
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 border-l border-gray-300/60 pl-3 sm:pl-3 lg:pl-4">
                    <Calendar className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 opacity-75" style={{ color: textColor }} />
                    <div className="flex flex-col justify-center">
                      <span className="text-xs sm:text-sm font-medium leading-tight opacity-80 whitespace-nowrap" style={{ color: textColor }}>
                        Sejak
                      </span>
                      <span className="text-sm sm:text-base font-bold leading-tight tracking-tight whitespace-nowrap" style={{ color: textColor }}>
                        2015
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  asChild
                  variant="outline"
                  className="font-medium px-5 sm:px-6 py-2 rounded-md transition-opacity hover:opacity-80"
                  style={{
                    backgroundColor: isButtonTransparent ? 'transparent' : buttonColor,
                    color: getButtonTextColor(),
                    borderColor: isButtonTransparent ? textColor : buttonColor,
                  }}
                >
                  <Link href={bottomBanner?.linkUrl || '/about'}>
                    {buttonText}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
