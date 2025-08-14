'use client';

import { motion } from 'framer-motion';
import { ProductCard } from '@/components/molecules/ProductCard';
import { useProducts } from '@/hooks/use-products';
import { Product } from '@/types';

// Varian animasi untuk container grid
const gridContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

// Varian animasi untuk setiap kartu produk
const cardVariants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } },
};

export default function ProductsPage() {
  const { data: products, isLoading, error } = useProducts();

  if (isLoading) {
    return <div className="text-center py-40">Memuat produk...</div>;
  }

  if (error) {
    return <div className="text-center py-40 text-red-500">Gagal memuat produk: {error.message}</div>;
  }

  const total = products?.length || 0;

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
        {/* --- Header --- */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Katalog Produk</h1>
          <p className="text-gray-600 mb-10 max-w-2xl mx-auto">
            Temukan semua sparepart yang Anda butuhkan untuk Vespa Anda.
          </p>
        </motion.div>

        {/* --- Info jumlah produk + Filter & Sort --- */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-lg shadow mb-8">
          <p className="text-gray-600">
            Menampilkan 0–{total} dari {total} produk
          </p>
          <div className="flex items-center gap-3 mt-4 sm:mt-0">
            <button className="bg-green-200 text-gray-800 px-4 py-2 rounded-md hover:bg-green-300 transition">
              Filter
            </button>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Urutkan:</span>
              <select className="border rounded-md px-3 py-2">
                <option>Terbaru</option>
                <option>Terlama</option>
                <option>Harga Terendah</option>
                <option>Harga Tertinggi</option>
              </select>
            </div>
          </div>
        </div>

        {/* --- Grid Produk --- */}
        {products && products.length > 0 ? (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8"
            variants={gridContainerVariants}
            initial="hidden"
            animate="show"
          >
            {products.map((product: Product) => (
              <motion.div key={product.id} variants={cardVariants}>
                <ProductCard product={product} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-20 bg-white rounded-lg shadow">
            <p className="text-gray-500">Belum ada produk yang tersedia.</p>
          </div>
        )}
      </div>
    </div>
  );
}
