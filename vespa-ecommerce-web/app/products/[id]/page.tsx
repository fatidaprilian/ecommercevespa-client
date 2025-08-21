// file: app/products/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Check, Minus, Plus, Package, Ruler, Tag, Edit, Info, ShieldCheck, Heart, Star, CreditCard, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

import { useProduct } from '@/hooks/use-product';
import { useCartStore } from '@/store/cart';
import { useAuthStore } from '@/store/auth';
import PriceDisplay from '@/components/molecules/PriceDisplay';
import { RelatedProducts } from './RelatedProducts';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';


const ProductDetailSkeleton = () => (
    <div className="bg-white min-h-screen pt-28 animate-pulse">
        <div className="container mx-auto px-4 py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
                <div>
                    <div className="bg-gray-200 h-[450px] rounded-xl"></div>
                    <div className="flex gap-4 mt-4">
                        <div className="bg-gray-200 h-24 w-24 rounded-lg"></div>
                        <div className="bg-gray-200 h-24 w-24 rounded-lg"></div>
                        <div className="bg-gray-200 h-24 w-24 rounded-lg"></div>
                    </div>
                </div>
                <div className="flex flex-col space-y-6">
                    <div className="h-6 w-1/3 bg-gray-200 rounded"></div>
                    <div className="h-12 w-full bg-gray-300 rounded"></div>
                    <div className="h-16 w-1/2 bg-gray-300 rounded my-4"></div>
                    <div className="h-24 w-full bg-gray-200 rounded"></div>
                    <div className="h-10 w-full bg-gray-200 rounded"></div>
                    <div className="flex gap-4 mt-4">
                        <div className="h-14 w-1/3 bg-gray-200 rounded-lg"></div>
                        <div className="h-14 flex-grow bg-gray-300 rounded-lg"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter(); // router sudah ada di sini
  const productId = params.id as string;

  const { addItem, isLoading: isCartLoading } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();
  const { data: product, isLoading, error } = useProduct(productId);

  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isInWishlist, setIsInWishlist] = useState(false);

  useEffect(() => {
    if (product && product.images && product.images.length > 0) {
      setSelectedImage(product.images[0].url);
    }
  }, [product]);

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      toast.error("Silakan login terlebih dahulu.");
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

  const handleToggleWishlist = () => {
    if (!isAuthenticated) {
        toast.error("Silakan login untuk menambahkan ke wishlist.");
        router.push('/login');
        return;
    }
    setIsInWishlist(!isInWishlist);
    toast.success(
        !isInWishlist ? "Produk ditambahkan ke wishlist!" : "Produk dihapus dari wishlist."
    );
  };
  
  const handleBuyNow = async () => {
    if (!isAuthenticated) {
        toast.error("Silakan login untuk melanjutkan pembelian.");
        router.push('/login');
        return;
    }
    if (product) {
      await addItem(product.id, quantity);
      router.push('/checkout');
    }
  };

  if (isLoading) return <ProductDetailSkeleton />;
  if (error) return <div className="text-center py-20 text-red-500">Error: {error.message}</div>;
  if (!product) return <div className="text-center py-20">Produk tidak ditemukan.</div>;

  return (
    <div className="bg-white min-h-screen pt-28">
      <div className="container mx-auto px-4 py-12">
        {/* === KODE TOMBOL KEMBALI DIMULAI DI SINI (SUDAH DIUBAH) === */}
        <div className="mb-6">
            <Button
              onClick={() => router.back()}
              variant="ghost"
              className="pl-0 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Button>
        </div>
        {/* === KODE TOMBOL KEMBALI SELESAI === */}
      
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start"
        >
          <div className="sticky top-28">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedImage}
                initial={{ opacity: 0.8 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0.8 }}
                transition={{ duration: 0.2 }}
                className="relative flex items-center justify-center bg-gray-100 aspect-square rounded-2xl overflow-hidden mb-4"
              >
                <img
                  src={selectedImage || 'https://placehold.co/600x600'}
                  alt={product.name}
                  className="w-full h-full object-contain mix-blend-multiply"
                />
              </motion.div>
            </AnimatePresence>
            <div className="grid grid-cols-5 gap-3">
              {product.images?.map((image) => (
                <button key={image.id} onClick={() => setSelectedImage(image.url)} className={cn('aspect-square rounded-lg bg-gray-100 overflow-hidden cursor-pointer transition-all duration-200 ring-offset-2 hover:ring-2 hover:ring-primary', selectedImage === image.url ? 'ring-2 ring-primary' : 'ring-0')}>
                   <img src={image.url} alt="" className="w-full h-full object-cover"/>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-3">
                {product.category && (
                    <Link href={`/products?categoryId=${product.category.id}`} className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full hover:bg-gray-200 transition-colors">
                        {product.category.name}
                    </Link>
                )}
                {product.brand && (
                    <Link href={`/products?brandId=${product.brand.id}`} className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full hover:bg-primary/20 transition-colors">
                        {product.brand.name}
                    </Link>
                )}
            </div>
            
            <div className="flex items-start justify-between gap-4">
                <h1 className="text-4xl lg:text-5xl font-bold text-gray-800 mb-2 font-playfair">{product.name}</h1>
                <Button onClick={handleToggleWishlist} variant="outline" size="icon" className="rounded-full h-12 w-12 flex-shrink-0 border-2 hover:bg-red-50">
                    <Heart className={cn("h-6 w-6 transition-all duration-300", isInWishlist ? "text-red-500 fill-red-500" : "text-gray-400" )} />
                </Button>
            </div>
            
            <div className="mb-6">
              <PriceDisplay priceInfo={product.priceInfo} className="text-5xl" originalPriceClassName="text-2xl" />
            </div>

            <p className="text-gray-600 leading-relaxed mb-8">{product.description || 'Tidak ada deskripsi untuk produk ini.'}</p>

            <div className="bg-gray-50 border rounded-lg p-4 space-y-3 mb-8">
                <div className="flex items-center gap-3 text-sm"><Tag size={16} className="text-gray-500"/><span>SKU: <span className="font-semibold text-gray-800">{product.sku}</span></span></div>
                <div className="flex items-center gap-3 text-sm"><Package size={16} className="text-gray-500"/><span>Stok: <span className={`font-bold ${product.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>{product.stock > 0 ? `${product.stock} Tersedia` : 'Stok Habis'}</span></span></div>
                <div className="flex items-center gap-3 text-sm"><Ruler size={16} className="text-gray-500"/><span>Berat: <span className="font-semibold text-gray-800">{product.weight} gram</span></span></div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 items-center">
              <div className="flex items-center justify-center border rounded-lg w-full sm:w-auto">
                <Button variant="ghost" onClick={() => setQuantity(q => Math.max(1, q - 1))} className="px-5 py-3 h-14" disabled={quantity <= 1}><Minus /></Button>
                <span className="px-6 font-bold text-xl w-16 text-center">{quantity}</span>
                <Button variant="ghost" onClick={() => setQuantity(q => Math.min(product.stock, q + 1))} className="px-5 py-3 h-14" disabled={quantity >= product.stock}><Plus /></Button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                       <Button size="lg" className="w-full h-14 text-base" disabled={isAdded || product.stock === 0 || isCartLoading}>
                           {isAdded ? <><Check size={20} className="mr-2"/> Ditambahkan</> : <><ShoppingCart size={20} className="mr-2"/><span>{product.stock > 0 ? 'Tambah Keranjang' : 'Stok Habis'}</span></>}
                       </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Konfirmasi Penambahan</AlertDialogTitle>
                      <AlertDialogDescription>
                        Anda akan menambahkan {quantity} x "{product.name}" ke keranjang. Lanjutkan?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction onClick={handleAddToCart}>Lanjutkan</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                
                <Button size="lg" variant="default" className="w-full h-14 text-base bg-green-600 hover:bg-green-700" disabled={product.stock === 0} onClick={handleBuyNow}>
                    <CreditCard size={20} className="mr-2"/>
                    Beli Sekarang
                </Button>
              </div>
            </div>

             <div className="flex items-center gap-3 mt-6 text-sm text-gray-500 p-3 bg-gray-50 rounded-lg">
                <ShieldCheck className="h-8 w-8 text-green-600 flex-shrink-0"/>
                <span>Garansi produk original. Kami menjamin keaslian dan kualitas setiap suku cadang yang kami jual.</span>
            </div>
          </div>
        </motion.div>

        <div className="mt-24">
            <Separator className="mb-12"/>
            {product.brand && <RelatedProducts productId={product.id} type="brand" title={`Produk Lainnya dari ${product.brand.name}`} />}
            {product.category && <RelatedProducts productId={product.id} type="category" title={`Anda Mungkin Juga Suka`} />}
        </div>
      </div>
    </div>
  );
}