'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ShoppingCart, Check, Minus, Plus, Package, Ruler, ArrowLeft, Heart, Search, X, ZoomIn, ZoomOut, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

import { useProduct } from '@/hooks/use-product';
import { useCartStore } from '@/store/cart';
import { useAuthStore } from '@/store/auth';
import { useWishlistStore } from '@/store/wishlist';
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import { BrandShowcase } from '@/components/organisms/BrandShowcase';
import { useRecentlyViewed } from '@/hooks/use-recently-viewed';
import { RecentlyViewed } from '@/components/organisms/RecentlyViewed';


const ProductDetailSkeleton = () => (
    <div className="bg-white min-h-screen pt-28 animate-pulse">
        <div className="container mx-auto px-4 py-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
                <div className="flex flex-row-reverse gap-4">
                    <div className="flex-grow bg-gray-200 h-[350px] lg:h-[450px] rounded-xl"></div>
                    <div className="flex flex-col gap-3 w-16 lg:w-20 flex-shrink-0">
                        <div className="bg-gray-200 h-16 lg:h-20 w-full rounded-lg"></div>
                        <div className="bg-gray-200 h-16 lg:h-20 w-full rounded-lg"></div>
                        <div className="bg-gray-200 h-16 lg:h-20 w-full rounded-lg"></div>
                    </div>
                </div>
                <div className="flex flex-col space-y-4">
                    <div className="h-8 lg:h-10 w-3/4 bg-gray-300 rounded"></div>
                    <div className="h-5 lg:h-6 w-1/3 bg-gray-300 rounded"></div>
                    <div className="h-10 lg:h-12 w-1/2 bg-gray-300 rounded my-4"></div>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="h-12 lg:h-14 w-full sm:w-1/3 bg-gray-200 rounded-lg"></div>
                        <div className="h-12 lg:h-14 flex-grow bg-gray-300 rounded-lg"></div>
                    </div>
                    <div className="h-10 w-full bg-gray-200 rounded"></div>
                </div>
            </div>
        </div>
    </div>
);

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } },
};

export default function ProductDetailPage() {
    const params = useParams();
    const router = useRouter();
    const productId = params.id as string;

    const { addItem, isLoading: isCartLoading } = useCartStore();
    const { isAuthenticated } = useAuthStore();
    const { data: product, isLoading, error } = useProduct(productId);
    
    const { toggleWishlist, isWishlisted } = useWishlistStore();
    const isInWishlist = isWishlisted(productId);

    const { addProduct: addRecentlyViewedProduct } = useRecentlyViewed();

    const [quantity, setQuantity] = useState(1);
    const [isAdded, setIsAdded] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const [isZoomOpen, setIsZoomOpen] = useState(false);
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const startPos = useRef({ x: 0, y: 0 });
    const imageRef = useRef<HTMLDivElement>(null);

    // Thumbnail scroll states (Logic Desktop)
    const [scrollPosition, setScrollPosition] = useState(0);
    const thumbnailContainerRef = useRef<HTMLDivElement>(null);
    const THUMBNAIL_HEIGHT = 108; 
    const MAX_VISIBLE_THUMBNAILS = 5;

    useEffect(() => {
        if (product) {
            if (product.images?.length) {
                setSelectedImage(product.images[0].url);
            }
            addRecentlyViewedProduct(product);
        }
    }, [product, addRecentlyViewedProduct]);

    const handleOpenChange = (open: boolean) => {
        setIsZoomOpen(open);
        if (!open) {
            resetImageState();
        }
    };

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 1 / 1.1 : 1.1;
        const newScale = Math.min(Math.max(scale * zoomFactor, 1), 5);
        
        if (newScale <= 1) {
            setPosition({ x: 0, y: 0 });
        }
        
        setScale(newScale);
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (scale > 1 && e.button === 0) {
            e.preventDefault();
            isDragging.current = true;
            startPos.current = { x: e.clientX - position.x, y: e.clientY - position.y };
            if (imageRef.current) {
                imageRef.current.style.cursor = 'grabbing';
            }
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isDragging.current && scale > 1) {
            e.preventDefault();
            const newX = e.clientX - startPos.current.x;
            const newY = e.clientY - startPos.current.y;
            setPosition({ x: newX, y: newY });
        }
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isDragging.current) {
            e.preventDefault();
            isDragging.current = false;
            if (imageRef.current) {
                imageRef.current.style.cursor = scale > 1 ? 'grab' : 'zoom-in';
            }
        }
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isDragging.current) {
            isDragging.current = false;
            if (imageRef.current) {
                imageRef.current.style.cursor = scale > 1 ? 'grab' : 'zoom-in';
            }
        }
    };

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
            toast.error("Login untuk menambahkan ke wishlist.");
            router.push('/login');
            return;
        }
        toggleWishlist(productId);
    };

    const resetImageState = () => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
        isDragging.current = false;
    };

    // Thumbnail scroll functions (Hanya untuk Desktop)
    const scrollThumbnails = (direction: 'up' | 'down') => {
        const container = thumbnailContainerRef.current;
        if (!container || !product?.images) return;

        const maxScroll = Math.max(0, (product.images.length - MAX_VISIBLE_THUMBNAILS) * THUMBNAIL_HEIGHT);
        
        if (direction === 'down') {
            setScrollPosition(prev => Math.min(prev + THUMBNAIL_HEIGHT, maxScroll));
        } else {
            setScrollPosition(prev => Math.max(prev - THUMBNAIL_HEIGHT, 0));
        }
    };

    const canScrollUp = scrollPosition > 0;
    const canScrollDown = product?.images && scrollPosition < (product.images.length - MAX_VISIBLE_THUMBNAILS) * THUMBNAIL_HEIGHT;
    const showScrollButtons = product?.images && product.images.length > MAX_VISIBLE_THUMBNAILS;

    if (isLoading) return <ProductDetailSkeleton />;
    if (error) return <div className="text-center py-20 text-red-500">Error: {error.message}</div>;
    if (!product) return <div className="text-center py-20">Produk tidak ditemukan.</div>;

    return (
        <div className="min-h-screen bg-white">
            <BrandShowcase />

            <div className="container mx-auto px-4 py-5">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-4 lg:mb-6">
                    <Button onClick={() => router.back()} variant="ghost" className="pl-0 text-gray-600 hover:text-gray-900">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Kembali
                    </Button>
                </motion.div>
            
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start mb-10">
                    
                    {/* GALLERY SECTION */}
                    {/* LOGIKA LAYOUT:
                        Mobile: flex-col (Main Image diatas, Thumbnail dibawah)
                        Desktop (lg): flex-row-reverse (Main Image kanan, Thumbnail kiri - preserved)
                    */}
                    <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }} className="lg:sticky lg:top-28 self-start w-full">
                        <div className="flex flex-col lg:flex-row-reverse gap-3 lg:gap-4">
                            
                            {/* Main Image Area */}
                            <Dialog open={isZoomOpen} onOpenChange={handleOpenChange}>
                                <DialogTrigger asChild>
                                    <motion.div
                                        key={selectedImage}
                                        className="relative flex-grow flex items-center justify-center bg-gray-100 aspect-square rounded-xl lg:rounded-2xl overflow-hidden cursor-pointer group w-full"
                                    >
                                        <img
                                            src={selectedImage || 'https://placehold.co/600x600'} alt={product.name}
                                            className="w-full h-full object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center transition-all duration-300">
                                            <Search className="h-12 w-12 text-gray-400 opacity-0 group-hover:opacity-60 transition-opacity duration-300" />
                                        </div>
                                    </motion.div>
                                </DialogTrigger>
                                
                                <DialogContent 
                                    showCloseButton={false}
                                    className="max-w-none w-screen h-screen bg-transparent border-none shadow-none flex items-center justify-center p-0"
                                >
                                    <DialogHeader className="sr-only">
                                        <DialogTitle>{product.name}</DialogTitle>
                                        <DialogDescription>Image viewer for {product.name}</DialogDescription>
                                    </DialogHeader>

                                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 p-2 rounded-lg z-20">
                                        <Button variant="ghost" size="icon" className="text-white hover:text-white hover:bg-white/20" onClick={() => setScale(prev => Math.max(prev / 1.2, 1))}><ZoomOut /></Button>
                                        <Button variant="ghost" size="icon" className="text-white hover:text-white hover:bg-white/20" onClick={resetImageState}><RefreshCw size={18} /></Button>
                                        <Button variant="ghost" size="icon" className="text-white hover:text-white hover:bg-white/20" onClick={() => setScale(prev => Math.min(prev * 1.2, 5))}><ZoomIn /></Button>
                                        <Button onClick={() => handleOpenChange(false)} variant="ghost" size="icon" className="text-white hover:text-white hover:bg-white/20"><X className="h-5 w-5"/></Button>
                                    </div>
                                    
                                    <div
                                        ref={imageRef}
                                        className="w-full h-full flex items-center justify-center select-none"
                                        onWheel={handleWheel}
                                        onMouseDown={handleMouseDown}
                                        onMouseMove={handleMouseMove}
                                        onMouseUp={handleMouseUp}
                                        onMouseLeave={handleMouseLeave}
                                        style={{ cursor: scale > 1 ? 'grab' : 'zoom-in' }}
                                    >
                                        <motion.img
                                            key={selectedImage}
                                            src={selectedImage || ''}
                                            alt="Zoomed product"
                                            className="block h-auto w-auto max-w-[95vw] max-h-[95vh] shadow-2xl pointer-events-none"
                                            style={{
                                                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                                                transition: isDragging.current ? 'none' : 'transform 0.1s linear',
                                            }}
                                            draggable={false}
                                        />
                                    </div>
                                </DialogContent>
                            </Dialog>

                            {/* THUMBNAILS WRAPPER 
                            */}
                            
                            {/* 1. DESKTOP VERSION (Hidden on Mobile) */}
                            {/* Menggunakan logika scroll vertikal asli & tombol panah */}
                            <div className="hidden lg:flex relative flex-col w-24 flex-shrink-0">
                                {showScrollButtons && canScrollUp && (
                                    <button onClick={() => scrollThumbnails('up')} className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-white/95 hover:bg-orange-50 rounded-full p-2 shadow-lg border-2 border-gray-300 transition-all backdrop-blur-sm">
                                        <ChevronUp size={20} className="text-gray-800" strokeWidth={2.5} />
                                    </button>
                                )}

                                <div 
                                    ref={thumbnailContainerRef}
                                    className="flex flex-col gap-3 overflow-hidden relative p-2"
                                    style={{ height: showScrollButtons ? `${MAX_VISIBLE_THUMBNAILS * THUMBNAIL_HEIGHT - 12}px` : 'auto' }}
                                >
                                    <div 
                                        className="flex flex-col gap-3 transition-transform duration-300 ease-out"
                                        style={{ transform: `translateY(-${scrollPosition}px)` }}
                                    >
                                        {product.images?.map((image) => (
                                            <button 
                                                key={`desktop-${image.id}`} 
                                                onClick={() => setSelectedImage(image.url)} 
                                                className={cn(
                                                    'aspect-square rounded-xl bg-gray-100 overflow-hidden cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg',
                                                    selectedImage === image.url ? 'scale-105 shadow-lg ring-2 ring-orange-400 ring-offset-2' : 'ring-0'
                                                )}
                                            >
                                                <img src={image.url} alt={`Thumbnail ${product.name}`} className="w-full h-full object-cover"/>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {showScrollButtons && canScrollDown && (
                                    <button onClick={() => scrollThumbnails('down')} className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-white/95 hover:bg-orange-50 rounded-full p-2 shadow-lg border-2 border-gray-300 transition-all backdrop-blur-sm">
                                        <ChevronDown size={20} className="text-gray-800" strokeWidth={2.5} />
                                    </button>
                                )}
                            </div>

                            {/* 2. MOBILE VERSION (Hidden on Desktop) */}
                            {/* Tampilan Horizontal dibawah gambar, Swipe native (tanpa tombol panah) */}
                            <div className="flex lg:hidden w-full overflow-x-auto gap-3 pb-2 scrollbar-hide">
                                {product.images?.map((image) => (
                                    <button 
                                        key={`mobile-${image.id}`} 
                                        onClick={() => setSelectedImage(image.url)} 
                                        className={cn(
                                            'flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gray-100 overflow-hidden cursor-pointer transition-all duration-200',
                                            selectedImage === image.url ? 'ring-2 ring-orange-400 ring-offset-1' : 'ring-0'
                                        )}
                                    >
                                        <img src={image.url} alt={`Thumbnail ${product.name}`} className="w-full h-full object-cover"/>
                                    </button>
                                ))}
                            </div>

                        </div>
                        
                        {product.brand && product.brand.logoUrl && (
                            <Link href={`/products?brandId=${product.brand.id}`} className="block mt-4 lg:mt-6 transition-opacity hover:opacity-70">
                                <img src={product.brand.logoUrl} alt={product.brand.name} className="w-10 lg:w-12 h-auto object-contain" />
                            </Link>
                        )}
                    </motion.div>

                    {/* PRODUCT INFO SECTION */}
                    <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col">
                        <motion.h1 variants={itemVariants} className="text-2xl sm:text-3xl lg:text-5xl font-bold text-gray-800 mb-2 leading-tight">
                            {product.name}
                        </motion.h1>
                        
                        {/* GRID UNTUK ALIGNMENT LABEL (Titik Dua Rapi) */}
                        <motion.div variants={itemVariants} className="mt-3 lg:mt-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                            {/* Menggunakan grid dengan kolom kiri fixed width (130px) agar rapi di semua ukuran */}
                            <div className="grid grid-cols-[130px_1fr] gap-y-3 text-sm lg:text-base">
                                {product.piaggioCode && (
                                    <>
                                        <div className="text-gray-500 font-medium flex items-center h-full">Piaggio Code:</div>
                                        <div className="font-bold text-gray-900 text-base lg:text-xl tracking-wide select-all flex items-center">
                                            {product.piaggioCode}
                                        </div>
                                    </>
                                )}

                                {product.category && (
                                    <>
                                        <div className="text-gray-500 font-medium flex items-center h-full">Kategori:</div>
                                        <div className="flex items-center">
                                            <Link 
                                                href={`/products?categoryId=${product.category.id}`} 
                                                className="font-bold text-orange-600 text-base lg:text-xl hover:underline hover:text-orange-700 transition-colors"
                                            >
                                                {product.category.name}
                                            </Link>
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                        
                        <Separator className="my-2 lg:my-4" />
                        
                        <motion.div variants={itemVariants} className="mb-6">
                            <PriceDisplay priceInfo={product.priceInfo} className="text-3xl lg:text-4xl" />
                        </motion.div>

                        {/* Tombol Stack Vertikal di Mobile */}
                        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6">
                            <div className="flex items-center justify-between sm:justify-center border rounded-lg h-12">
                                <Button variant="ghost" onClick={() => setQuantity(q => Math.max(1, q - 1))} className="px-4 h-full" disabled={quantity <= 1}><Minus size={16} /></Button>
                                <span className="px-4 font-bold text-lg w-12 text-center">{quantity}</span>
                                <Button variant="ghost" onClick={() => setQuantity(q => Math.min(product.stock, q + 1))} className="px-4 h-full" disabled={quantity >= product.stock}><Plus size={16} /></Button>
                            </div>
                            
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button size="lg" className="h-12 flex-grow text-base bg-orange-500 hover:bg-orange-600 text-white w-full sm:w-auto" disabled={isAdded || product.stock === 0 || isCartLoading}>
                                        {isAdded ? <><Check size={20} className="mr-2"/> Ditambahkan</> : <><ShoppingCart size={20} className="mr-2"/><span>{product.stock > 0 ? 'Masukkan ke Keranjang' : 'Stok Habis'}</span></>}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Konfirmasi</AlertDialogTitle><AlertDialogDescription>Tambahkan {quantity} x "{product.name}" ke keranjang?</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={handleAddToCart}>Lanjutkan</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </motion.div>

                        <motion.div variants={itemVariants} className="text-sm text-gray-600 space-y-2">
                            <div className="flex items-center gap-2"><Package size={16}/><span>Stok: <span className={`font-bold ${product.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>{product.stock > 0 ? `${product.stock} Tersedia` : 'Stok Habis'}</span></span></div>
                            <div className="flex items-center gap-2"><Ruler size={16}/><span>Berat: <span className="font-semibold text-gray-800">{product.weight || 'N/A'} gram</span></span></div>
                        </motion.div>
                        <motion.div variants={itemVariants} className="mt-6">
                            <Button onClick={handleToggleWishlist} variant="outline" className="w-full">
                                <Heart className={cn("h-4 w-4 mr-2", isInWishlist ? "text-red-500 fill-red-500" : "text-gray-400" )} />
                                {isInWishlist ? 'Hapus dari Wishlist' : 'Tambah ke Wishlist'}
                            </Button>
                        </motion.div>
                    </motion.div>
                </div>

                <div className="mb-24">
                    <Separator className="my-8 lg:my-16"/>
                    <h2 className="text-2xl lg:text-3xl font-bold text-center mb-6 lg:mb-8">DESKRIPSI PRODUK</h2>
                    <div className="w-full max-w-none lg:max-w-4xl mx-auto bg-gray-50 p-4 lg:p-8 rounded-lg overflow-hidden">
                        <div className="prose prose-sm sm:prose-base lg:prose-lg text-gray-700 max-w-full break-words">
                            {product.description ? (
                                <div className="w-full overflow-x-auto">
                                    <div dangerouslySetInnerHTML={{ __html: product.description }} />
                                </div>
                            ) : (
                                <p>Tidak ada deskripsi untuk produk ini.</p>
                            )}
                            {product.models && (
                                <p className="font-semibold mt-4">
                                    MODELS: <span className="font-normal">{product.models}</span>
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div>
                    {product.brand && <RelatedProducts productId={product.id} type="brand" value={product.brand.id} title={`Produk Lainnya dari ${product.brand.name}`} />}
                    {product.category && <RelatedProducts productId={product.id} type="category" value={product.category.id} title={`Anda Mungkin Juga Suka`} />}
                </div>

                <Separator className="my-8 lg:my-16"/>
                <RecentlyViewed currentProductId={productId} />
            </div>
        </div>
    );
}