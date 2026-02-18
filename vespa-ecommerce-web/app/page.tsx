'use client';

import { useRef, useEffect, useMemo } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";

import { useProducts, getProducts } from "@/hooks/use-products";
import { useFeaturedProducts } from "@/hooks/use-featured-products"; // <--- IMPORT HOOK BARU
import { Product } from "@/types";
import { useAuthStore } from "@/store/auth";
import api from "@/lib/api";

import { ProductCard } from "@/components/molecules/ProductCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { HeroSection } from "@/components/organisms/HeroSection";
import { MiddleBanner } from "@/components/organisms/MiddleBanner";
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

const BestSellerSkeleton = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
        {Array.from({ length: 5 }).map((_, i) => (
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
    // Component is now presentational
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

                {isLoading ? <BestSellerSkeleton /> : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
                        {products.map((product: Product, index: number) => (
                            <motion.div
                                key={product.id}
                                initial={{ opacity: 1, y: 0 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, amount: 0.3 }}
                                transition={{ duration: 0.6, delay: index * 0.1 }}
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

const SecondaryProducts = ({ excludeIds }: { excludeIds: string[] }) => {
    const hasHydrated = useAuthStore((state) => state._hasHydrated);
    // Use excludeIds in the query
    const { data: productsResponse, isLoading, error } = useProducts(
        { sortBy: 'createdAt', sortOrder: 'asc', limit: 5, excludeIds },
        hasHydrated
    );

    const secondaryProducts = productsResponse?.data;

    if (error) return null;

    return (
        <Section className="bg-white py-4 md:py-6">
            <div className="container mx-auto px-4">
                {isLoading || !hasHydrated ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="space-y-3">
                                <Skeleton className="h-48 w-full" />
                                <Skeleton className="h-4 w-2/3" />
                                <Skeleton className="h-6 w-1/2" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
                        {secondaryProducts?.slice(0, 5).map((product: Product, index: number) => (
                            <motion.div
                                key={product.id}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, amount: 0.3 }}
                                transition={{ duration: 0.6, delay: index * 0.1 }}
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

    // 1. Fetch Best Seller Data here
    const { data: featuredProducts, isLoading: isLoadingFeatured } = useFeaturedProducts(hasHydrated);
    const { data: regularProductsResponse, isLoading: isLoadingRegular } = useProducts(
        { sortBy: 'createdAt', sortOrder: 'desc', limit: 10 },
        hasHydrated
    );

    // 2. Compute Combined Products (Logic lifted from BestSellerProducts)
    const combinedBestSellers = useMemo(() => {
        if (!featuredProducts && !regularProductsResponse?.data) return [];

        const featured = featuredProducts || [];
        const regular = regularProductsResponse?.data || [];

        const featuredIds = new Set(featured.map(p => p.id));

        const uniqueRegularProducts = regular.filter(p => !featuredIds.has(p.id));

        return [...featured, ...uniqueRegularProducts].slice(0, 5); // Slice here to get exact 5
    }, [featuredProducts, regularProductsResponse]);

    const isBestSellerLoading = (isLoadingFeatured || isLoadingRegular) && hasHydrated;

    // 3. Compute IDs to exclude
    const bestSellerIds = useMemo(() => {
        return combinedBestSellers.map(p => p.id);
    }, [combinedBestSellers]);

    useEffect(() => {
        if (isAuthenticated) {
            // Prefetch featured products
            queryClient.prefetchQuery({
                queryKey: ['featured-products'],
                queryFn: () => api.get('/products/featured').then(res => res.data),
            });
            // Prefetch regular products
            queryClient.prefetchQuery({
                queryKey: ['products', { sortBy: 'createdAt', sortOrder: 'desc', limit: 10 }],
                queryFn: () => getProducts({ sortBy: 'createdAt', sortOrder: 'desc', limit: 10 }),
            });
            // Note: Prefetch for secondary products might need adjustment if logic changes, 
            // but since excludeIds is dynamic, prefetching strict key might be tricky. 
            // We can leave basic prefetch or update it if needed.
        }
    }, [isAuthenticated, queryClient]);

    return (
        <div className="min-h-screen bg-white">
            <HeroSection />
            <BrandShowcase />
            <BestSellerProducts
                products={combinedBestSellers}
                isLoading={isBestSellerLoading}
            />
            <MiddleBanner />
            <SecondaryProducts excludeIds={bestSellerIds} />
        </div>
    );
}