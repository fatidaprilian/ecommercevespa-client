// file: app/products/[id]/page.tsx
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ShoppingCart, Check, Minus, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

import { useProduct } from '@/hooks/use-product';
import { useCartStore } from '@/store/cart';
import { useAuthStore } from '@/store/auth';
import PriceDisplay from '@/components/molecules/PriceDisplay'; // <-- Import komponen harga

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  
  const { addItem, isLoading: isCartLoading } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const { data: product, isLoading, error } = useProduct(productId);
  
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      toast.error("Silakan login terlebih dahulu untuk menambah item.");
      router.push('/login');
      return;
    }
    if (product) {
      addItem(product.id, quantity);
      toast.success(`${product.name} ditambahkan ke keranjang!`);
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><p>Memuat detail produk...</p></div>;
  }
  if (error) {
    return <div className="text-center p-10 text-red-500">Error: {error.message}</div>;
  }
  if (!product) {
    return <div className="text-center p-10">Produk tidak ditemukan.</div>;
  }
  
  const imageUrl = product.images?.[0]?.url || 'https://placehold.co/600x600';

  return (
    <div className="bg-gray-50 min-h-screen pt-28">
      <div className="container mx-auto px-4 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white p-8 rounded-2xl shadow-lg grid grid-cols-1 md:grid-cols-2 gap-12"
        >
          {/* Galeri Gambar */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-center bg-gray-100 h-96 rounded-xl overflow-hidden"
          >
            <img 
              src={imageUrl} 
              alt={product.name}
              className="w-full h-full object-contain"
            />
          </motion.div>
          
          {/* Info Produk */}
          <div className="flex flex-col justify-center">
            <span className="text-sm font-semibold text-gray-500 bg-gray-100 w-fit px-3 py-1 rounded-full mb-3">
              {product.category?.name || 'Uncategorized'}
            </span>
            <h1 className="text-4xl font-bold text-[#1E2022] mb-2 font-playfair">{product.name}</h1>
            <p className="text-md text-gray-500 mb-4">SKU: {product.sku}</p>
            
            {/* --- PERUBAHAN UTAMA DI SINI --- */}
            <div className="mb-6">
              <PriceDisplay 
                priceInfo={product.priceInfo} 
                className="text-5xl" 
                originalPriceClassName="text-2xl" 
              />
            </div>

            <div className="mb-6 border-t pt-6">
              <h2 className="font-semibold text-xl mb-2 text-gray-800">Deskripsi</h2>
              <p className="text-gray-600 leading-relaxed">{product.description || 'Tidak ada deskripsi untuk produk ini.'}</p>
            </div>
            
            <div className="text-lg mb-6">
              <span className="text-gray-600">Stok: </span>
              <span className={`font-bold ${product.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                {product.stock > 0 ? `${product.stock} Tersedia` : 'Stok Habis'}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center border rounded-lg">
                <button 
                  onClick={() => setQuantity(q => Math.max(1, q - 1))} 
                  className="px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-l-lg disabled:opacity-50"
                  disabled={quantity <= 1}
                >
                  <Minus size={16} />
                </button>
                <span className="px-6 font-semibold text-lg">{quantity}</span>
                <button 
                  onClick={() => setQuantity(q => Math.min(product.stock, q + 1))} 
                  className="px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-r-lg disabled:opacity-50"
                  disabled={quantity >= product.stock}
                >
                  <Plus size={16} />
                </button>
              </div>

              <button 
                onClick={handleAddToCart}
                disabled={isAdded || product.stock === 0 || isCartLoading}
                className={`w-full flex items-center justify-center gap-2 font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105
                  ${isAdded ? 'bg-green-500 text-white' : 'bg-[#52616B] text-white hover:bg-[#1E2022]'}
                  ${product.stock === 0 ? 'bg-gray-400 cursor-not-allowed hover:scale-100' : ''}
                `}
              >
                {isAdded ? (
                  <><Check size={20} /> Ditambahkan</>
                ) : (
                  <><ShoppingCart size={20} /><span>{product.stock > 0 ? 'Tambah ke Keranjang' : 'Stok Habis'}</span></>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}