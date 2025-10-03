// app/hooks/use-products-by-ids.ts

import { useQueries } from '@tanstack/react-query';
import api from '../lib/api';
import { Product } from '../types';

const fetchProductById = async (id: string): Promise<Product> => {
    // Pastikan ID adalah string dan bukan objek
    if (typeof id !== 'string' || !id) {
        return Promise.reject(new Error('Invalid product ID'));
    }
    const { data } = await api.get(`/products/${id}`);
    return data;
};

export const useProductsByIds = (ids: string[]) => {
    const results = useQueries({
        queries: ids.map(id => ({
            queryKey: ['product', id],
            // 1. PERBAIKAN: Mengambil ID dari queryKey dengan benar
            queryFn: ({ queryKey }) => {
                const [_key, productId] = queryKey;
                return fetchProductById(productId as string);
            },
            // 2. PERBAIKAN: Matikan refetch saat window focus
            refetchOnWindowFocus: false,
            staleTime: 1000 * 60 * 5, // Cache data selama 5 menit
            enabled: !!id,
        })),
    });

    const products = results
        .map(result => result.data)
        .filter(Boolean) as Product[];
    
    // Urutkan kembali produk sesuai urutan ID terakhir dilihat
    const sortedProducts = products.sort((a, b) => {
        return ids.indexOf(a.id) - ids.indexOf(b.id);
    });

    const isLoading = results.some(result => result.isLoading && result.fetchStatus !== 'idle');
    const isError = results.some(result => result.isError);

    return { products: sortedProducts, isLoading, isError };
};