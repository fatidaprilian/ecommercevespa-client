// file: app/page.tsx (Revisi Lengkap)
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
    Tag,
} from "lucide-react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";

import { useProducts, getProducts } from "@/hooks/use-products"; // Perubahan di sini
import { useCategories } from "@/hooks/use-categories";
import { useBrands } from "@/hooks/use-brands";
import { Product, Category, Brand } from "@/types";
import { useAuthStore } from "@/store/auth";

import { ProductCard } from "@/components/molecules/ProductCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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
            transition={{ duration: 0.8, ease: [0.17, 0.55, 0.55, 1] }}
            className={`py-16 md:py-24 ${className}`}
        >
            <div className="container mx-auto px-4 md:px-6 lg:px-8">
                {children}
            </div>
        </motion.section>
    );
};

const HeroSection = () => {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
    const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
    const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

    return (
        <div ref={ref} className="relative w-full h-screen flex items-center justify-center text-center overflow-hidden bg-[#1E2022]">
            <motion.div style={{ y }} className="absolute inset-0 z-0">
                <img src="https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=2070&auto=format&fit=crop" alt="Vespa classic detail" className="w-full h-full object-cover opacity-30" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1E2022] via-transparent to-transparent"></div>
            </motion.div>
            
            <motion.div style={{ opacity }} className="relative z-10 px-4 max-w-4xl">
                 <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2, ease: "circOut" }}>
                     <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                         <Award className="w-4 h-4 text-gray-300" /> Spesialis Suku Cadang Vespa
                     </span>
                 </motion.div>
                <motion.h1
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.4, ease: "circOut" }}
                    className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 font-playfair"
                >
                    Anatomi Sang Legenda
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.6, ease: "circOut" }}
                    className="text-md sm:text-lg text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed"
                >
                    Setiap komponen adalah sebuah warisan. Suku cadang original yang menjaga keaslian dan menyempurnakan performa ikonik Vespa Anda.
                </motion.p>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.8, ease: "circOut" }}>
                    <Button asChild size="lg" className="bg-[#C9D6DF] text-[#1E2022] font-bold hover:bg-white transition-all transform hover:scale-105 shadow-lg">
                        <Link href="/products">
                            Mulai Jelajahi <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </Button>
                </motion.div>
            </motion.div>
        </div>
    );
};

// [REVISI] Komponen CategoriesSection dengan posisi tombol yang disesuaikan
const CategoriesSection = () => {
    const { data: categoriesResponse, isLoading, error } = useCategories({ limit: 4 });
    const categories = categoriesResponse?.data; 

    const categoryIcons: { [key: string]: React.ElementType } = {
        'Engine Parts': Wrench, 'Body & Frame': Package, 'Electrical': Zap, 'Accessories': Sparkles, 'default': Tag
    };
    
    if (error) return null;

    return (
        <Section className="bg-white">
            {/* [DIUBAH] Header section diubah menjadi flexbox */}
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-12">
                <div className="text-center md:text-left mb-6 md:mb-0">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1E2022] mb-3 font-playfair">Jelajahi Setiap Detail</h2>
                    <p className="text-md sm:text-lg text-gray-600">Temukan komponen yang Anda butuhkan berdasarkan kategori.</p>
                </div>
                <Button asChild variant="outline" size="lg">
                    <Link href="/categories">
                        Lihat Semua Kategori <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-96 rounded-lg" />)
                ) : (
                    categories?.map((cat: Category, index: number) => {
                        const Icon = categoryIcons[cat.name] || categoryIcons.default;
                        const imageSrc = cat.imageUrl || `https://source.unsplash.com/400x500/?${cat.name.split(' ')[0].toLowerCase()}`;
                        
                        return (
                            <motion.div
                                key={cat.id}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, amount: 0.3 }}
                                transition={{ duration: 0.6, delay: index * 0.1, ease: "circOut" }}
                            >
                                <Link href={`/products?categoryId=${cat.id}`} className="group block h-full">
                                    <div className="relative h-96 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1">
                                        <img src={imageSrc} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                                        <div className="absolute bottom-0 left-0 p-6">
                                            <div className="bg-[#C9D6DF] text-[#1E2022] p-3 rounded-full w-fit mb-3 transition-transform group-hover:scale-105"><Icon className="w-6 h-6" /></div>
                                            <h3 className="text-xl font-bold text-white transition-colors font-playfair">{cat.name}</h3>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        )
                    })
                )}
            </div>
        </Section>
    );
};

const BrandsSkeleton = () => (
    <div className="flex flex-wrap justify-center items-center gap-x-16 gap-y-10">
        {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-32" />
        ))}
    </div>
);

const BrandsSection = () => {
    const { data: brandsResponse, isLoading, error } = useBrands();
    const brands = brandsResponse?.data; 

    if (error) return null;

    return (
        <Section className="bg-[#F0F5F9]">
            <div className="text-center mb-12 md:mb-16 max-w-3xl mx-auto">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1E2022] mb-4 font-playfair">Merek Terpercaya Kami</h2>
                <p className="text-md sm:text-lg text-gray-600">Koleksi suku cadang dari merek-merek terbaik yang menjamin kualitas.</p>
            </div>
            {isLoading ? <BrandsSkeleton /> : (
                <div className="flex flex-wrap justify-center items-center gap-x-12 sm:gap-x-16 md:gap-x-24 gap-y-10">
                    {brands?.map((brand: Brand, index: number) => (
                        <motion.div
                            key={brand.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.5 }}
                            transition={{ duration: 0.5, delay: index * 0.05 }}
                        >
                            <Link href={`/products?brandId=${brand.id}`} title={`Lihat produk dari ${brand.name}`} className="grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300 transform hover:scale-110">
                                {brand.logoUrl ? (
                                    <img src={brand.logoUrl} alt={`${brand.name} logo`} className="h-12 md:h-16 object-contain" />
                                ) : (
                                    <span className="text-xl font-semibold text-gray-500">{brand.name}</span>
                                )}
                            </Link>
                        </motion.div>
                    ))}
                </div>
            )}
        </Section>
    )
}

const FeaturedProductsSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3">
                <Skeleton className="h-52 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-6 w-1/2" />
            </div>
        ))}
    </div>
);

const FeaturedProducts = () => {
    const hasHydrated = useAuthStore((state) => state._hasHydrated);
    const { data: productsResponse, isLoading, error } = useProducts(
      { sortBy: 'createdAt', sortOrder: 'desc', limit: 4 },
      hasHydrated
    );
    
    const featuredProducts = productsResponse?.data;

    if (error) return null;

    return (
        <Section className="bg-white">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-12">
                <div className="text-center md:text-left mb-6 md:mb-0">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1E2022] mb-3 font-playfair">Produk Unggulan</h2>
                    <p className="text-md sm:text-lg text-gray-600">Pilihan terbaik dari para pelanggan setia kami.</p>
                </div>
                <Button asChild variant="outline" size="lg">
                    <Link href="/products">
                        Lihat Semua Produk <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                </Button>
            </div>
            
            {isLoading || !hasHydrated ? <FeaturedProductsSkeleton /> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {featuredProducts?.map((product: Product, index: number) => (
                        <motion.div
                            key={product.id}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.3 }}
                            transition={{ duration: 0.6, delay: index * 0.1 }}
                        >
                            <ProductCard product={product} />
                        </motion.div>
                    ))}
                </div>
            )}
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
    if (isAuthenticated) {
        queryClient.prefetchQuery({
            queryKey: ['products', { sortBy: 'createdAt', sortOrder: 'desc', limit: 4 }],
            // Perubahan di sini
            queryFn: () => getProducts({ sortBy: 'createdAt', sortOrder: 'desc', limit: 4 }),
        });
    }
  }, [isAuthenticated, queryClient]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const handleScroll = () => {
      document.body.classList.add('scrolling');
      clearTimeout(timer);
      timer = setTimeout(() => {
        document.body.classList.remove('scrolling');
      }, 250);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="bg-[#F0F5F9]">
        <HeroSection />
        <FeaturedProducts />
        <CategoriesSection />
        <BrandsSection />
    </div>
  );
}