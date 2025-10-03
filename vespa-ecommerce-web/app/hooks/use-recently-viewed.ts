// app/hooks/use-recently-viewed.ts

import { Product } from '@/types';
import { useCallback } from 'react';

const RECENTLY_VIEWED_KEY = 'recentlyViewed';
const MAX_RECENT_PRODUCTS = 10;

export const useRecentlyViewed = () => {
    const addProduct = useCallback((product: Product) => {
        if (!product || typeof window === 'undefined') return;

        const storedItems = localStorage.getItem(RECENTLY_VIEWED_KEY);
        let productIds: string[] = storedItems ? JSON.parse(storedItems) : [];

        // Hapus ID jika sudah ada untuk dipindahkan ke depan
        productIds = productIds.filter(id => id !== product.id);

        // Tambahkan ID produk baru di awal
        productIds.unshift(product.id);

        // Batasi jumlah produk yang disimpan
        const sliced = productIds.slice(0, MAX_RECENT_PRODUCTS);

        localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(sliced));
    }, []);

    const getProductIds = useCallback((): string[] => {
        if (typeof window === 'undefined') return [];
        const storedItems = localStorage.getItem(RECENTLY_VIEWED_KEY);
        return storedItems ? JSON.parse(storedItems) : [];
    }, []);

    return { addProduct, getProductIds };
};