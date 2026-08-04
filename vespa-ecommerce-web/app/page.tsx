'use client';

import { useRef, useEffect, useMemo } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";

import { useProducts, getProducts } from "@/hooks/use-products";
import { useFeaturedProducts, useSecondaryFeaturedProducts } from "@/hooks/use-featured-products";
import { useBanners } from "@/hooks/use-banners";
import { Product } from "@/types";
import { useAuthStore } from "@/store/auth";
import api from "@/lib/api";

import { ProductCard } from "@/components/molecules/ProductCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { HeroSection } from "@/components/organisms/HeroSection";
import { PromoBanners } from "@/components/organisms/PromoBanners";
import { MiddleBanner } from "@/components/organisms/MiddleBanner";
import { AboutJssBanner } from "@/components/organisms/AboutJssBanner";
import { BrandShowcase } from "@/components/organisms/BrandShowcase";
import { Star } from "lucide-react";

const Section = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.2 });

    return (
        <motion.section
            ref={ref}
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={`${className}`}
        >
            {children}
        </motion.section>
    );
};

const ProductSkeleton = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
        {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="space-y-3">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-6 w-1/2" />
            </div>
        ))}
    </div>
);

const BestSellerProducts = ({
    products,
    isLoading
}: {
    products: Product[],
    isLoading: boolean
}) => {
    return (
        <Section className="bg-white py-4 md:py-6">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl md:text-2xl font-bold text-gray-800">Best Seller</h2>
                        <div className="bg-[#f04e23] text-white px-2 py-1 text-xs font-medium rounded">
                            HOT
                        </div>
                    </div>
                    <Button asChild variant="link" className="text-[#f04e23] hover:text-[#e03e1a] p-0 h-auto font-medium">
                        <Link href="/products">
                            Lihat Semua →
                        </Link>
                    </Button>
                </div>

                {isLoading ? <ProductSkeleton /> : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
                        {products.map((product: Product, index: number) => (
                            <motion.div
                                key={product.id}
                                initial={{ opacity: 1, y: 0 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, amount: 0.3 }}
                                transition={{ duration: 0.6, delay: index * 0.05 }}
                                className="relative group"
                            >
                                {product.isFeatured && (
                                    <div className="absolute top-2 left-2 z-10 bg-yellow-400 text-black px-2 py-1 text-xs font-bold rounded flex items-center gap-1">
                                        <Star className="w-3 h-3" /> PILIHAN
                                    </div>
                                )}
                                <ProductCard product={product} />
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </Section>
    );
};

const SecondaryProducts = ({ excludeIds }: { excludeIds: string[]; brandId?: string }) => {
    const hasHydrated = useAuthStore((state) => state._hasHydrated);
    
    const { data: secondaryProducts, isLoading, error } = useSecondaryFeaturedProducts(excludeIds, hasHydrated);

    if (error) return null;

    return (
        <Section className="bg-white py-4 md:py-6">
            <div className="container mx-auto px-4">
                {isLoading || !hasHydrated ? (
                    <ProductSkeleton />
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
                        {(secondaryProducts || []).map((product: Product, index: number) => (
                            <motion.div
                                key={product.id}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, amount: 0.3 }}
                                transition={{ duration: 0.6, delay: index * 0.05 }}
                                className="relative group"
                            >
                                <ProductCard product={product} />
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </Section>
    );
};

export default function HomePage() {
    const { isAuthenticated, _hasHydrated: hasHydrated } = useAuthStore();
    const queryClient = useQueryClient();

    const { data: featuredProducts, isLoading: isLoadingFeatured } = useFeaturedProducts(hasHydrated);

    const { data: banners } = useBanners();
    const middleBanner = banners?.find((b) => b.type === 'MIDDLE');
    const middleBrandId = middleBanner?.brandId;

    const bestSellerProducts = featuredProducts || [];
    const bestSellerIds = useMemo(() => {
        return bestSellerProducts.map(p => p.id);
    }, [bestSellerProducts]);

    useEffect(() => {
        if (isAuthenticated) {
            void queryClient.prefetchQuery({
                queryKey: ['featured-products'],
                queryFn: () => api.get('/products/featured').then(res => res.data),
            });
            void queryClient.prefetchQuery({
                queryKey: ['secondary-featured-products'],
                queryFn: () => api.get('/products/secondary-featured').then(res => res.data),
            });
            void queryClient.prefetchQuery({
                queryKey: ['products', { sortBy: 'createdAt', sortOrder: 'desc', limit: 10 }],
                queryFn: () => getProducts({ sortBy: 'createdAt', sortOrder: 'desc', limit: 10 }),
            });
        }
    }, [isAuthenticated, queryClient]);

    return (
        <div className="min-h-screen bg-white">
            <HeroSection />
            <PromoBanners />
            <BrandShowcase />
            <BestSellerProducts
                products={bestSellerProducts}
                isLoading={isLoadingFeatured}
            />
            <MiddleBanner />
            <SecondaryProducts excludeIds={bestSellerIds} brandId={middleBrandId} />
            <AboutJssBanner />
        </div>
    );
}