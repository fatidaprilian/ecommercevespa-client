'use client';

import { useRef, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";

import { useProducts, getProducts } from "@/hooks/use-products";
import { Product } from "@/types";
import { useAuthStore } from "@/store/auth";

import { ProductCard } from "@/components/molecules/ProductCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { HeroSection } from "@/components/organisms/HeroSection";
import { MiddleBanner } from "@/components/organisms/MiddleBanner";
import { BrandShowcase } from "@/components/organisms/BrandShowcase";

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

const BestSellerProducts = () => {
    const hasHydrated = useAuthStore((state) => state._hasHydrated);
    const { data: productsResponse, isLoading, error } = useProducts(
        { sortBy: 'createdAt', sortOrder: 'desc', limit: 10 },
        hasHydrated
    );

    const bestSellerProducts = productsResponse?.data;

    if (error) return null;

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
                            View All →
                        </Link>
                    </Button>
                </div>

                {isLoading || !hasHydrated ? <BestSellerSkeleton /> : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
                        {bestSellerProducts?.slice(0, 5).map((product: Product, index: number) => (
                            <motion.div
                                key={product.id}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, amount: 0.3 }}
                                transition={{ duration: 0.6, delay: index * 0.1 }}
                                className="relative group"
                            >
                                <div className="absolute top-2 left-2 z-10 bg-[#f04e23] text-white px-2 py-1 text-xs font-bold rounded">
                                    TOP
                                </div>
                                <ProductCard product={product} />
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </Section>
    );
};

const SecondaryProducts = () => {
    const hasHydrated = useAuthStore((state) => state._hasHydrated);
    const { data: productsResponse, isLoading, error } = useProducts(
        { sortBy: 'createdAt', sortOrder: 'asc', limit: 5 },
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
    const { isAuthenticated } = useAuthStore();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (isAuthenticated) {
            queryClient.prefetchQuery({
                queryKey: ['products', { sortBy: 'createdAt', sortOrder: 'desc', limit: 10 }],
                queryFn: () => getProducts({ sortBy: 'createdAt', sortOrder: 'desc', limit: 10 }),
            });
            queryClient.prefetchQuery({
                queryKey: ['products', { sortBy: 'createdAt', sortOrder: 'asc', limit: 5 }],
                queryFn: () => getProducts({ sortBy: 'createdAt', sortOrder: 'asc', limit: 5 }),
            });
        }
    }, [isAuthenticated, queryClient]);

    return (
        <div className="min-h-screen bg-white pt-32">
            <HeroSection />
            <BrandShowcase />
            <BestSellerProducts />
            <MiddleBanner />
            <SecondaryProducts />
        </div>
    );
}