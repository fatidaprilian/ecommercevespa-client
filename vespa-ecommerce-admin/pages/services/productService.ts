import axios from 'axios';

// Mengambil URL API dari environment variable
const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Definisikan tipe data untuk payload produk
interface ProductData {
    name: string;
    sku: string;
    price: number;
    stock: number;
    description?: string;
}

/**
 * Mengirim data produk baru ke API backend.
 * @param productData - Objek yang berisi data produk baru.
 * @returns Data produk yang berhasil dibuat dari API.
 */
export const createProduct = async (productData: ProductData) => {
    try {
        const response = await axios.post(`${API_URL}/products`, productData, {
            withCredentials: true, // Mengirim cookie untuk otentikasi
        });
        return response.data;
    } catch (error) {
        console.error("API Error - createProduct:", error);
        // Melempar error lagi agar bisa ditangkap oleh react-query
        throw error;
    }
};