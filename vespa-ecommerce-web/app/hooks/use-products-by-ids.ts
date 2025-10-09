// app/hooks/use-products-by-ids.ts

import { useQueries } from '@tanstack/react-query';
import api from '../lib/api';
import { Product } from '../types';

const fetchProductById = async (id: string): Promise<Product> => {
    // Pengecekan ID Anda sudah bagus, kita pertahankan.
    if (typeof id !== 'string' || !id) {
        return Promise.reject(new Error('Invalid product ID provided'));
    }
    const { data } = await api.get(`/products/${id}`);
    return data;
};

export const useProductsByIds = (ids: string[]) => {
    // ✅ REVISI 1: Saring array untuk memastikan hanya ID yang valid yang diproses.
    const validIds = ids ? ids.filter(id => typeof id === 'string' && id) : [];

    const results = useQueries({
        queries: validIds.map(id => ({
            queryKey: ['product', id],
            queryFn: ({ queryKey }) => {
                const [_key, productId] = queryKey;
                return fetchProductById(productId as string);
            },
            refetchOnWindowFocus: false,
            staleTime: 1000 * 60 * 5, // Cache data selama 5 menit
            // Properti `enabled` di sini tidak lagi diperlukan karena kita sudah menyaring `validIds`
        })),
    });

    const products = results
        .map(result => result.data)
        // Gunakan type guard untuk filtering yang lebih aman
        .filter((product): product is Product => !!product); 
    
    // ✅ REVISI 2 (Opsional): Optimasi kecil untuk pengurutan menggunakan Map
    const orderMap = new Map(validIds.map((id, index) => [id, index]));
    const sortedProducts = [...products].sort((a, b) => {
        const indexA = orderMap.get(a.id) ?? Infinity;
        const indexB = orderMap.get(b.id) ?? Infinity;
        return indexA - indexB;
    });

    // ✅ REVISI 3: Menyederhanakan pengecekan status loading
    const isLoading = results.some(result => result.isLoading);
    const isError = results.some(result => result.isError);

    return { products: sortedProducts, isLoading, isError };
};