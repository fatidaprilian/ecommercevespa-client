// /app/products/[id]/page.tsx
'use client';

import { useState } from 'react';
// Corrected the import path for the hook
import { useProducts } from '@/hooks/use-products'; 
import { useCartStore } from '@/store/cart';
import { useParams, useRouter } from 'next/navigation';
import { ShoppingCart, Check, Minus, Plus } from 'lucide-react';

// Helper to format the price safely
const formatPrice = (price: number | string) => {
  const numericPrice = typeof price === 'string' ? Number(price) : price;
  if (isNaN(numericPrice)) {
    return 'Harga tidak tersedia';
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(numericPrice);
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  
  const { addItem } = useCartStore();
  // Pass the productId to the hook
  const { data: product, isLoading, error } = useProducts(productId);
  
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToCart = () => {
    if (product) {
      addItem(product, quantity);
      setIsAdded(true);
      
      // Provide visual feedback for 2 seconds
      setTimeout(() => {
        setIsAdded(false);
      }, 2000);

      // Optional: uncomment this line to automatically go to the cart page
      // router.push('/cart');
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><p>Loading product details...</p></div>;
  }

  if (error) {
    return <div className="text-center p-10 text-red-500">Error: {error.message}</div>;
  }

  if (!product) {
    return <div className="text-center p-10">Product not found.</div>;
  }

  return (
    <div className="bg-gray-50 min-h-screen pt-28">
      <div className="container mx-auto px-4 py-12">
        <div className="bg-white p-8 rounded-2xl shadow-lg grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="flex items-center justify-center bg-gray-100 h-96 rounded-xl overflow-hidden">
            <img 
              src={product.images?.[0] || 'https://placehold.co/400x400'} 
              alt={product.name}
              className="w-full h-full object-contain"
            />
          </div>
          
          <div className="flex flex-col justify-center">
            <span className="text-sm font-semibold text-gray-500 bg-gray-100 w-fit px-3 py-1 rounded-full mb-3">
              {product.category?.name || 'Uncategorized'}
            </span>
            <h1 className="text-4xl font-bold text-[#1E2022] mb-2 font-playfair">{product.name}</h1>
            <p className="text-md text-gray-500 mb-4">SKU: {product.sku}</p>
            
            <p className="text-5xl font-bold text-[#52616B] mb-6">
              {formatPrice(product.price)}
            </p>

            <div className="mb-6 border-t pt-6">
              <h2 className="font-semibold text-xl mb-2 text-gray-800">Deskripsi</h2>
              <p className="text-gray-600 leading-relaxed">{product.description || 'Tidak ada deskripsi untuk produk ini.'}</p>
            </div>
            
            <div className="text-lg mb-6">
              <span className="text-gray-600">Stok: </span>
              <span className="font-bold text-green-600">{product.stock > 0 ? `${product.stock} Tersedia` : 'Stok Habis'}</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center border rounded-lg">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-l-lg"><Minus size={16} /></button>
                <span className="px-6 font-semibold text-lg">{quantity}</span>
                <button onClick={() => setQuantity(q => Math.min(product.stock, q + 1))} className="px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-r-lg"><Plus size={16} /></button>
              </div>

              <button 
                onClick={handleAddToCart}
                disabled={isAdded || product.stock === 0}
                className={`w-full flex items-center justify-center gap-2 font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105
                  ${isAdded 
                    ? 'bg-green-500 text-white' 
                    : 'bg-[#52616B] text-white hover:bg-[#1E2022]'
                  }
                  ${product.stock === 0 ? 'bg-gray-400 cursor-not-allowed' : ''}
                `}
              >
                {isAdded ? (
                  <>
                    <Check size={20} /> Ditambahkan
                  </>
                ) : (
                  <>
                    <ShoppingCart size={20} />
                    <span>
                      {product.stock > 0 ? 'Tambah ke Keranjang' : 'Stok Habis'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}