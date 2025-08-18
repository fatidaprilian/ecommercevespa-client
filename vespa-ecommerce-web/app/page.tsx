// file: vespa-ecommerce-web/app/page.tsx
'use client';

import { useRef, useEffect } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import {
    ArrowRight,
    Award,
    Wrench,
    Package,
    Zap,
    Sparkles,
    Tag
} from "lucide-react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";

// Impor hook dan tipe data
import { useProducts } from "@/hooks/use-products";
import { useCategories } from "@/hooks/use-categories";
import { useBrands } from "@/hooks/use-brands";
import { Product, Category, Brand } from "@/types";
import { useAuthStore } from "@/store/auth";
import PriceDisplay from "@/components/molecules/PriceDisplay";

// ====================================================================
// Komponen Pembantu & Bagian Halaman
// ====================================================================

const Section = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.2 });
    return (
        <motion.section
            ref={ref}
            initial={{ opacity: 0, y: 50 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.9, ease: [0.17, 0.55, 0.55, 1] }}
            className={`py-20 px-4 md:py-28 md:px-6 ${className}`}
        >
            {children}
        </motion.section>
    );
};

const HeroSection = () => {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
    const y = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
    const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

    return (
        <div ref={ref} className="relative w-full h-screen flex items-center justify-center text-center overflow-hidden bg-[#1E2022]">
            <motion.div style={{ y }} className="absolute inset-0 z-0">
                <img src="https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=2070&auto=format&fit=crop" alt="Classic Vespa detail" className="w-full h-full object-cover opacity-30" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1E2022] via-transparent to-transparent"></div>
            </motion.div>
            <motion.div style={{ opacity }} className="relative z-10 px-6 max-w-4xl">
                 <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="mb-6">
                    <span className="inline-flex items-center gap-2 bg-[#C9D6DF]/10 backdrop-blur-sm border border-white/20 text-[#F0F5F9] px-5 py-2 rounded-full text-sm font-medium">
                        <Award className="w-4 h-4 text-[#C9D6DF]" /> Spesialis Suku Cadang Vespa
                    </span>
                </motion.div>
                <motion.h1
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
                    className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 font-playfair"
                >
                    Anatomi Sang Legenda
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.6, ease: "easeOut" }}
                    className="text-lg md:text-xl text-[#C9D6DF] max-w-2xl mx-auto mb-10 leading-relaxed"
                >
                    Setiap komponen adalah sebuah warisan. Suku cadang original yang menjaga keaslian dan menyempurnakan performa ikonik Vespa Anda.
                </motion.p>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.8 }} className="flex gap-4 justify-center">
                    <Link href="/products" className="group relative inline-flex items-center gap-3 bg-[#C9D6DF] text-[#1E2022] font-bold py-3 px-8 rounded-lg text-base hover:bg-white transition-all transform hover:scale-105 shadow-lg">
                        Mulai Jelajahi <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </motion.div>
            </motion.div>
        </div>
    );
};

// 👇 **START OF CHANGES** 👇
const CategoriesSection = () => {
  const { data: categories, isLoading, error } = useCategories();
  const categoryIcons: { [key: string]: React.ElementType } = {
    'Engine Parts': Wrench,
    'Body & Frame': Package,
    'Electrical': Zap,
    'Accessories': Sparkles,
    'default': Tag // Mengganti default icon
  };

  if (isLoading) return <Section className="bg-white"><p className="text-center text-gray-500">Memuat kategori...</p></Section>;
  if (error || !categories) return null;

  return (
    <Section className="bg-white">
      <div className="container mx-auto">
        <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-4xl sm:text-5xl font-bold text-[#1E2022] mb-4 font-playfair">Jelajahi Setiap Detail</h2>
            <p className="text-lg text-gray-600">Temukan komponen yang Anda butuhkan berdasarkan kategori spesifik untuk setiap bagian vital Vespa Anda.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat: Category, index: number) => {
            const Icon = categoryIcons[cat.name] || categoryIcons.default;
            // Gunakan imageUrl dari data, jika tidak ada, gunakan placeholder
            const imageSrc = cat.imageUrl || `https://source.unsplash.com/400x500/?${cat.name.split(' ')[0].toLowerCase()}`;
            
            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }}
              >
                <Link href={`/products?categoryId=${cat.id}`} className="group block cursor-pointer">
                  <div className="relative h-96 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1">
                    <img src={imageSrc} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 p-6">
                      <div className="bg-[#C9D6DF] text-[#1E2022] p-3 rounded-full w-fit mb-3 transition-transform group-hover:scale-105"><Icon className="w-6 h-6" /></div>
                      <h3 className="text-2xl font-bold text-white group-hover:text-[#F0F5F9] transition-colors font-playfair">{cat.name}</h3>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>
    </Section>
  );
};
// 👆 **END OF CHANGES** 👆

const BrandsSection = () => {
    const { data: brands, isLoading, error } = useBrands();

    if (isLoading) return <Section className="bg-[#F0F5F9]"><p className="text-center text-gray-500">Memuat merek...</p></Section>;
    if (error || !brands) return null;

    return (
        <Section className="bg-[#F0F5F9]">
            <div className="container mx-auto">
                <div className="text-center mb-16 max-w-3xl mx-auto">
                  <h2 className="text-4xl sm:text-5xl font-bold text-[#1E2022] mb-4 font-playfair">Merek Terpercaya Kami</h2>
                  <p className="text-lg text-gray-600">Pilih dari koleksi suku cadang dari merek-merek terbaik yang menjamin kualitas dan daya tahan.</p>
                </div>
                <div className="flex flex-wrap justify-center items-center gap-x-16 md:gap-x-24 gap-y-10">
                    {brands.map((brand: Brand, index: number) => (
                        <motion.div
                          key={brand.id}
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, amount: 0.5 }}
                          transition={{ duration: 0.5, delay: index * 0.05 }}
                        >
                            <Link href={`/products?brandId=${brand.id}`} title={`Lihat produk dari ${brand.name}`} className="grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300 transform hover:scale-110">
                                {brand.logoUrl ? (
                                    <img src={brand.logoUrl} alt={`${brand.name} logo`} className="h-10 md:h-16 object-contain" />
                                ) : (
                                    <span className="text-2xl font-semibold text-gray-500">{brand.name}</span>
                                )}
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>
        </Section>
    )
}

const FeaturedProducts = () => {
    const hasHydrated = useAuthStore((state) => state._hasHydrated);
    const { data: productsResponse, isLoading, error } = useProducts(
      { sortBy: 'createdAt', sortOrder: 'desc', limit: 4 },
      hasHydrated
    );
    
    if (!hasHydrated || isLoading) {
      return <Section className="bg-white"><p className="text-center text-gray-500">Memuat produk unggulan...</p></Section>;
    }
    
    const featuredProducts = productsResponse?.data;

    if (error || !featuredProducts || featuredProducts.length === 0) {
      return null;
    }

    return (
        <Section className="bg-white">
            <div className="container mx-auto">
                <div className="flex flex-col md:flex-row justify-between md:items-center mb-12">
                    <div className="text-center md:text-left mb-6 md:mb-0">
                        <h2 className="text-4xl sm:text-5xl font-bold text-[#1E2022] mb-3 font-playfair">Produk Unggulan</h2>
                        <p className="text-lg text-gray-600">Pilihan terbaik dari para pelanggan setia kami.</p>
                    </div>
                    <Link href="/products" className="group self-center md:self-auto inline-flex items-center gap-2 bg-[#52616B] text-white font-semibold py-3 px-6 rounded-lg hover:bg-[#1E2022] transition-colors">
                        Lihat Semua Produk <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {featuredProducts.map((product: Product, index: number) => (
                        <motion.div
                          key={product.id}
                          initial={{ opacity: 0, y: 30 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, amount: 0.3 }}
                          transition={{ duration: 0.6, delay: index * 0.1 }}
                        >
                            <Link href={`/products/${product.id}`} className="block group">
                                <div className="bg-white border border-gray-200/80 rounded-lg overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
                                    <div className="relative w-full h-52 bg-[#F0F5F9]">
                                      <img
                                          src={product.images?.[0]?.url || 'https://placehold.co/400x400?text=VespaPart'}
                                          alt={product.name}
                                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      />
                                    </div>
                                    <div className="p-5 flex flex-col flex-grow">
                                      <span className="text-xs text-gray-500 mb-1">{product.category?.name || 'Uncategorized'}</span>
                                      <h3 className="font-bold text-md text-[#1E2022] flex-grow group-hover:text-[#52616B] transition-colors h-12" title={product.name}>
                                          {product.name}
                                      </h3>
                                      <div className="mt-2">
                                        <PriceDisplay priceInfo={product.priceInfo} className="text-xl" originalPriceClassName="text-base" />
                                      </div>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>
        </Section>
    );
};

// ====================================================================
// Komponen Utama Halaman
// ====================================================================

export default function HomePage() {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
  }, [isAuthenticated, queryClient]);

  return (
    <div className="bg-[#F0F5F9]">
      <HeroSection />
      <FeaturedProducts />
      <CategoriesSection />
      <BrandsSection />
    </div>
  );
}