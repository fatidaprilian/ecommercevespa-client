// app/hooks/use-recently-viewed.ts

import { Product } from '@/types';
import { useCallback } from 'react';

const RECENTLY_VIEWED_KEY = 'recentlyViewed';
const MAX_RECENT_PRODUCTS = 10;

export const useRecentlyViewed = () => {
    const addProduct = useCallback((product: Product) => {
        if (!product || typeof window === 'undefined') return;

        let productIds: string[] = [];
        try {
            const storedItems = localStorage.getItem(RECENTLY_VIEWED_KEY);
            productIds = storedItems ? JSON.parse(storedItems) : [];
            if (!Array.isArray(productIds)) productIds = [];
        } catch {
            productIds = [];
        }

        // Remove existing ID to move it to the front
        productIds = productIds.filter(id => id !== product.id);

        // Prepend new product ID
        productIds.unshift(product.id);

        // Limit maximum items stored
        const sliced = productIds.slice(0, MAX_RECENT_PRODUCTS);

        try {
            localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(sliced));
        } catch {
            // Ignore storage write errors (e.g. private browsing quota)
        }
    }, []);

    const getProductIds = useCallback((): string[] => {
        if (typeof window === 'undefined') return [];
        try {
            const storedItems = localStorage.getItem(RECENTLY_VIEWED_KEY);
            const parsed = storedItems ? JSON.parse(storedItems) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }, []);

    return { addProduct, getProductIds };
};