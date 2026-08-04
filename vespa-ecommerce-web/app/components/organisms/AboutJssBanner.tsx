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
  const textColor = bottomBanner?.textColor || '#1f2937'; // gray-800 default
  const buttonColor = bottomBanner?.buttonColor || '#1f2937';
  const buttonText = bottomBanner?.buttonText || 'Selengkapnya Tentang Kami';
  const isButtonTransparent = buttonColor === 'transparent';

  // Calculate contrast text color for button so white button has dark text, dark button has white text
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
          className="relative overflow-hidden rounded-2xl border border-gray-200/80 bg-[#f9f9f9] grid grid-cols-1 lg:grid-cols-12 min-h-[360px] shadow-sm"
        >
          {/* Right Image Container - 50% width on Desktop with Crisp Image & Soft Edge Fade */}
          <div className="absolute right-0 top-0 bottom-0 w-full lg:w-[50%] overflow-hidden z-0">
            <Image
              src={bgImage}
              alt="Tentang JSS"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover object-center w-full h-full"
            />
            {/* Soft gradient fade strictly on left transition edge so photo stays 100% crisp & clear */}
            <div className="absolute inset-y-0 left-0 w-24 md:w-40 bg-gradient-to-r from-[#f9f9f9] to-transparent pointer-events-none z-10" />
          </div>

          {/* Left Side - Static Content with dynamic colors */}
          <div className="lg:col-span-7 p-6 md:p-10 flex flex-col justify-between z-10 relative">
            <div>
              <h2
                className="text-2xl md:text-3xl font-bold mb-3"
                style={{ color: textColor }}
              >
                Tentang Jakarta Scooter Shop
              </h2>
              <p
                className="text-sm md:text-base leading-relaxed mb-6 max-w-xl"
                style={{ color: textColor, opacity: 0.85 }}
              >
                Jakarta Scooter Shop (JSS) adalah importir dan distributor resmi spare part Vespa klasik dari berbagai merek premium asal Italia. Kami berkomitmen menyediakan produk original berkualitas tinggi untuk para pecinta dan restorator Vespa di Indonesia.
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-6 py-5 border-y border-gray-300/70 max-w-2xl">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-black/5 shrink-0">
                    <Boxes className="w-5 h-5 md:w-6 md:h-6" style={{ color: textColor }} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl md:text-2xl font-extrabold tracking-tight" style={{ color: textColor }}>
                      300+
                    </span>
                    <span className="text-[11px] md:text-xs font-semibold uppercase tracking-wider" style={{ color: textColor, opacity: 0.75 }}>
                      Merek &amp; Part
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 sm:border-l sm:border-gray-300/60 sm:pl-3">
                  <div className="p-2 rounded-lg bg-black/5 shrink-0">
                    <Globe2 className="w-5 h-5 md:w-6 md:h-6" style={{ color: textColor }} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl md:text-2xl font-extrabold tracking-tight" style={{ color: textColor }}>
                      10+
                    </span>
                    <span className="text-[11px] md:text-xs font-semibold uppercase tracking-wider" style={{ color: textColor, opacity: 0.75 }}>
                      Merek Italia
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 sm:border-l sm:border-gray-300/60 sm:pl-3">
                  <div className="p-2 rounded-lg bg-black/5 shrink-0">
                    <Wrench className="w-5 h-5 md:w-6 md:h-6" style={{ color: textColor }} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl md:text-2xl font-extrabold tracking-tight" style={{ color: textColor }}>
                      1.000+
                    </span>
                    <span className="text-[11px] md:text-xs font-semibold uppercase tracking-wider" style={{ color: textColor, opacity: 0.75 }}>
                      Mitra Bengkel
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 sm:border-l sm:border-gray-300/60 sm:pl-3">
                  <div className="p-2 rounded-lg bg-black/5 shrink-0">
                    <Calendar className="w-5 h-5 md:w-6 md:h-6" style={{ color: textColor }} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl md:text-2xl font-extrabold tracking-tight" style={{ color: textColor }}>
                      2015
                    </span>
                    <span className="text-[11px] md:text-xs font-semibold uppercase tracking-wider" style={{ color: textColor, opacity: 0.75 }}>
                      Berdiri Sejak
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button
                asChild
                variant="outline"
                className="font-medium px-6 py-2 rounded-md transition-opacity hover:opacity-80"
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

          {/* Right Side - Image area (quote is baked into the uploaded image) */}
          <div className="lg:col-span-5 relative z-10 min-h-[200px] lg:min-h-full" />
        </motion.div>
      </div>
    </section>
  );
}
