'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface CmsPage {
  slug: string;
  title: string;
  content: string;
  bannerImageUrl?: string;
}

const getAboutPage = async (): Promise<CmsPage> => {
  const { data } = await api.get('/pages/about-us');
  return data;
};

export function AboutJssBanner() {
  const { data: page, isLoading } = useQuery<CmsPage>({
    queryKey: ['cms-page', 'about-us'],
    queryFn: getAboutPage,
    staleTime: 1000 * 60 * 10,
  });

  if (isLoading) {
    return (
      <section className="w-full py-6 md:py-10 bg-white">
        <div className="container mx-auto px-4">
          <Skeleton className="w-full h-72 rounded-xl" />
        </div>
      </section>
    );
  }

  const bgImage = page?.bannerImageUrl || 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=1200&auto=format&fit=crop';

  return (
    <section className="w-full py-6 md:py-10 bg-white">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-xl border border-gray-200 bg-[#f9f9f9] grid grid-cols-1 lg:grid-cols-12 min-h-[340px]"
        >
          {/* Background Image full height right with fade */}
          <div className="absolute inset-0 z-0">
            <Image
              src={bgImage}
              alt="Tentang JSS"
              fill
              className="object-cover object-right w-full h-full filter brightness-90 contrast-95"
            />
            {/* Soft gradient fade from left (#f9f9f9) to right transparent */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#f9f9f9] via-[#f9f9f9]/90 md:via-[#f9f9f9]/80 to-transparent w-full lg:w-3/4" />
          </div>

          {/* Left Side - Content */}
          <div className="lg:col-span-7 p-6 md:p-10 flex flex-col justify-between z-10 relative">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                Tentang Jakarta Scooter Shop
              </h2>
              <p className="text-gray-700 text-sm md:text-base leading-relaxed mb-6 max-w-xl">
                Jakarta Scooter Shop (JSS) adalah importir dan distributor resmi spare part Vespa klasik dari berbagai merek premium asal Italia. Kami berkomitmen menyediakan produk original berkualitas tinggi untuk para pecinta dan restorator Vespa di Indonesia.
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-2 md:gap-4 my-4 py-4 border-t border-b border-gray-300/80 max-w-lg">
                <div className="text-center sm:text-left">
                  <span className="block text-xl md:text-2xl font-bold text-gray-900">300+</span>
                  <span className="text-[11px] md:text-xs text-gray-600 font-medium">Merek & Part</span>
                </div>
                <div className="text-center sm:text-left">
                  <span className="block text-xl md:text-2xl font-bold text-gray-900">10+</span>
                  <span className="text-[11px] md:text-xs text-gray-600 font-medium">Merek Italia</span>
                </div>
                <div className="text-center sm:text-left">
                  <span className="block text-xl md:text-2xl font-bold text-gray-900">1000+</span>
                  <span className="text-[11px] md:text-xs text-gray-600 font-medium">Workshop Trust Us</span>
                </div>
                <div className="text-center sm:text-left">
                  <span className="block text-xl md:text-2xl font-bold text-gray-900">2015</span>
                  <span className="text-[11px] md:text-xs text-gray-600 font-medium">Sejak</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button asChild variant="outline" className="border-gray-800 text-gray-800 hover:bg-gray-900 hover:text-white font-medium px-6 py-2 rounded-md">
                <Link href="/about">
                  Selengkapnya Tentang Kami
                </Link>
              </Button>
            </div>
          </div>

          {/* Right Side - Quote Box */}
          <div className="lg:col-span-5 relative z-10 min-h-[200px] lg:min-h-full flex items-center justify-end p-6 md:p-8">
            <div className="bg-[#222222]/90 text-white p-6 md:p-8 rounded-xl max-w-sm shadow-xl border border-gray-700/50 backdrop-blur-sm">
              <p className="text-sm md:text-base font-normal leading-relaxed mb-4">
                &ldquo;Kualitas bukan kebetulan, ini adalah komitmen kami.&rdquo;
              </p>
              <div className="w-8 h-[2px] bg-red-600 mb-2" />
              <p className="text-xs text-gray-300 font-medium">
                &mdash; Jakarta Scooter Shop Team
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
