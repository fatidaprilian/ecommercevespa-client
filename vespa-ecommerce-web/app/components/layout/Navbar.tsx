'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    Menu, X, Search, ShoppingCart,
    Heart, ChevronDown, Package, Wrench, Zap, Sparkles, Tag, Loader2
} from 'lucide-react';

import ClientOnly from '@/components/providers/ClientOnly';
import AuthNav from '@/components/molecules/AuthNav';
import { useCartStore } from '@/store/cart';
import { useCategories } from '@/hooks/use-categories';
import { Category, Product } from '@/types';
import api from '@/lib/api';

const getCategoryIcon = (categoryName: string) => {
    switch (categoryName.toLowerCase()) {
        case 'engine parts': return Wrench;
        case 'body & frame': return Package;
        case 'electrical': return Zap;
        case 'accessories': return Sparkles;
        default: return Tag;
    }
};

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const { data: categoriesResponse, isLoading: isLoadingCategories } = useCategories();
    const categories = categoriesResponse?.data;
    
    const { cart } = useCartStore();
    const uniqueItemCount = cart?.items?.length || 0;

    const pathname = usePathname();
    const isAuthPage = pathname === '/login' || pathname === '/register';

    useEffect(() => {
        setIsOpen(false); // Tutup menu mobile saat navigasi
        setIsSearchOpen(false); // Tutup search bar saat navigasi
        const handleScroll = () => setIsScrolled(window.scrollY > 50);
        if (isAuthPage) {
            setIsScrolled(true);
        } else {
            handleScroll();
            window.addEventListener('scroll', handleScroll);
            return () => window.removeEventListener('scroll', handleScroll);
        }
    }, [pathname, isAuthPage]);

    useEffect(() => {
        if (isSearchOpen) {
            setTimeout(() => searchInputRef.current?.focus(), 100);
        } else {
            setSearchQuery('');
            setSearchResults([]);
        }
    }, [isSearchOpen]);

    useEffect(() => {
        if (searchQuery.length < 2) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }
        setIsSearching(true);
        const debounceTimeout = setTimeout(async () => {
            try {
                const { data } = await api.get('/products/search', { params: { term: searchQuery } });
                setSearchResults(data);
            } catch (error) {
                console.error("Search failed:", error);
            } finally {
                setIsSearching(false);
            }
        }, 300);
        return () => clearTimeout(debounceTimeout);
    }, [searchQuery]);

    const handleSearchSelect = (productId: string) => {
        router.push(`/products/${productId}`);
        setIsSearchOpen(false);
    };
    
    const navigationLinks = [
        { name: 'Home', href: '/' },
        { name: 'Products', href: '/products', hasDropdown: true },
        { name: 'About', href: '/about' },
        { name: 'Contact', href: '/contact' }
    ];

    const navIsSolid = isScrolled || isAuthPage;
    const textColorClass = navIsSolid ? 'text-[#1E2022]' : 'text-white';

    return (
        <>
            <motion.nav
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
                    navIsSolid
                        ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200/50'
                        : 'bg-[#1E2022]/20 backdrop-blur-md'
                }`}
            >
                <div className="container mx-auto px-6">
                    <div className="flex items-center justify-between h-20">
                        <Link href="/" className="flex items-center space-x-3 group">
                            <div className="relative">
                                <div className="w-12 h-12 bg-gradient-to-br from-[#52616B] to-[#1E2022] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                    <Package className="w-6 h-6 text-white" />
                                </div>
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#C9D6DF] rounded-full border-2 border-white"></div>
                            </div>
                            <div className="hidden sm:block">
                                <h1 className={`text-2xl font-bold transition-colors duration-300 ${textColorClass}`} style={{ fontFamily: "'Playfair Display', serif" }}>
                                    VespaParts
                                </h1>
                            </div>
                        </Link>

                        <div className="hidden md:flex items-center space-x-6">
                            {navigationLinks.map((link) => (
                                <div key={link.name} className="relative group" onMouseEnter={() => link.hasDropdown && setActiveDropdown(link.name)} onMouseLeave={() => link.hasDropdown && setActiveDropdown(null)}>
                                    <Link href={link.href} className={`text-lg font-medium transition-colors duration-300 flex items-center gap-1.5 pb-1 ${pathname === link.href ? textColorClass : navIsSolid ? 'text-gray-500 hover:text-[#1E2022]' : 'text-gray-400 hover:text-white'}`}>
                                        {link.name}
                                        {link.hasDropdown && <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${activeDropdown === link.name ? 'rotate-180' : ''}`} />}
                                    </Link>
                                    <div className={`absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-300 ${pathname === link.href ? 'w-full' : ''} ${navIsSolid ? 'bg-[#1E2022]' : 'bg-white'}`}></div>

                                    {link.hasDropdown && activeDropdown === link.name && (
                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.2 }} className="absolute top-full pt-4 left-1/2 -translate-x-1/2 w-64">
                                            <div className="bg-white rounded-lg shadow-xl overflow-hidden p-2">
                                                {isLoadingCategories ? ( <div className="p-3 text-center text-gray-500">Memuat...</div> ) : (
                                                    categories?.map((category: Category) => {
                                                        const Icon = getCategoryIcon(category.name);
                                                        return ( <Link key={category.id} href={`/products?categoryId=${category.id}`} className="flex items-center p-3 rounded-md text-gray-700 hover:bg-gray-100 transition-colors duration-200">
                                                            <Icon className="w-5 h-5 mr-3 text-[#52616B]" />
                                                            <span className="font-medium">{category.name}</span>
                                                        </Link>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className={`flex items-center space-x-2 md:space-x-4 ${textColorClass}`}>
                            <div className="flex items-center">
                                <AnimatePresence>
                                    {isSearchOpen && (
                                        <motion.div 
                                            initial={{ width: 0, opacity: 0 }} 
                                            animate={{ width: 200, opacity: 1 }} 
                                            exit={{ width: 0, opacity: 0 }} 
                                            transition={{ duration: 0.3 }} 
                                            className="relative"
                                        >
                                            <input 
                                                ref={searchInputRef}
                                                type="text" 
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Cari produk..." 
                                                className={`w-full h-9 pl-4 pr-2 rounded-lg text-black bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#52616B] text-sm border border-gray-300`}
                                            />
                                            {(searchResults.length > 0 || isSearching) && (
                                                <motion.div 
                                                    initial={{ opacity: 0, y: 5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="absolute top-11 left-0 w-full bg-white rounded-lg shadow-lg border flex flex-col"
                                                >
                                                    <div className="max-h-80 overflow-y-auto">
                                                        {isSearching && (
                                                            <div className="flex items-center justify-center p-4 text-sm text-gray-500">
                                                                <Loader2 className="w-4 h-4 animate-spin mr-2"/> Mencari...
                                                            </div>
                                                        )}
                                                        {!isSearching && searchResults.map((product: Product) => (
                                                            <button key={product.id} onClick={() => handleSearchSelect(product.id)} className="w-full text-left flex items-center gap-3 p-3 hover:bg-gray-100 transition-colors">
                                                                <img src={product.images?.[0]?.url || 'https://placehold.co/100x100'} alt={product.name} className="w-10 h-10 object-cover rounded-md flex-shrink-0" />
                                                                <span className="text-sm text-gray-800">{product.name}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                    {!isSearching && searchResults.length > 0 && (
                                                        <Link href={`/products?search=${searchQuery}`} onClick={() => setIsSearchOpen(false)} className="block w-full text-center p-3 border-t bg-gray-50 hover:bg-gray-100 text-sm font-semibold text-blue-600">
                                                            Lihat Semua Hasil
                                                        </Link>
                                                    )}
                                                </motion.div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                <button onClick={() => setIsSearchOpen(!isSearchOpen)} className={`p-2 rounded-full transition-all duration-300 hover:scale-110 ${navIsSolid ? 'hover:bg-[#C9D6DF]/50 hover:text-[#52616B]' : 'hover:bg-white/10'}`}>
                                    {isSearchOpen ? <X className="w-5 h-5"/> : <Search className="w-5 h-5" />}
                                </button>
                            </div>
                            
                            <Link href="/cart" className={`relative p-2 rounded-full transition-all duration-300 hover:scale-110 ${navIsSolid ? 'hover:bg-[#C9D6DF]/50 hover:text-[#52616B]' : 'hover:bg-white/10'}`}>
                                <ShoppingCart className="w-5 h-5" />
                                <ClientOnly>
                                    {uniqueItemCount > 0 && (
                                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                                            {uniqueItemCount}
                                        </span>
                                    )}
                                </ClientOnly>
                            </Link>

                            <div className="hidden md:block">
                                <ClientOnly><AuthNav /></ClientOnly>
                            </div>

                            <button onClick={() => setIsOpen(!isOpen)} className={`md:hidden p-2 rounded-full transition-all duration-300 hover:scale-110 ${navIsSolid ? 'hover:bg-[#C9D6DF]/50 hover:text-[#52616B]' : 'hover:bg-white/10'}`}>
                                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.nav>

            <AnimatePresence>
                {isOpen && (
                    <div className="md:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
                        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }} onClick={(e) => e.stopPropagation()} className="absolute top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl flex flex-col">
                            <div className="p-6 flex justify-between items-center border-b border-gray-200">
                                <h2 className="text-xl font-bold text-[#1E2022]">Menu</h2>
                                <button onClick={() => setIsOpen(false)} className="p-2 -mr-2"><X className="w-6 h-6 text-gray-500" /></button>
                            </div>
                            <div className="flex-grow p-6 space-y-2 overflow-y-auto">
                                {navigationLinks.map((link) => (
                                    <div key={link.name}>
                                        {link.hasDropdown ? (
                                            <div>
                                                {/* ================================================================== */}
                                                {/* === PERBAIKAN DI SINI === */}
                                                {/* ================================================================== */}
                                                <div className="w-full flex justify-between items-center text-left text-lg font-semibold text-gray-700 p-3 rounded-lg hover:bg-gray-100">
                                                    {/* Link untuk ke halaman /products */}
                                                    <Link href={link.href} onClick={() => setIsOpen(false)} className="flex-grow">
                                                        {link.name}
                                                    </Link>
                                                    {/* Tombol panah untuk membuka dropdown */}
                                                    <button onClick={() => setActiveDropdown(activeDropdown === link.name ? null : link.name)} className="p-2 -mr-2">
                                                        <ChevronDown className={`w-5 h-5 transition-transform ${activeDropdown === link.name ? 'rotate-180' : ''}`} />
                                                    </button>
                                                </div>
                                                <AnimatePresence>
                                                    {activeDropdown === link.name && (
                                                        <motion.div initial="collapsed" animate="open" exit="collapsed" variants={{ open: { opacity: 1, height: 'auto' }, collapsed: { opacity: 0, height: 0 } }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="overflow-hidden pl-6 mt-1">
                                                            {isLoadingCategories ? ( <div className="p-3 text-gray-500">Memuat...</div> ) : (
                                                                categories?.map(category => {
                                                                    const Icon = getCategoryIcon(category.name);
                                                                    return ( <Link key={category.id} href={`/products?categoryId=${category.id}`} onClick={() => setIsOpen(false)} className="flex items-center p-3 rounded-lg text-gray-600 hover:bg-gray-100">
                                                                        <Icon className="w-5 h-5 mr-3 text-gray-400" />
                                                                        {category.name}
                                                                    </Link>
                                                                    );
                                                                })
                                                            )}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        ) : (
                                            <Link href={link.href} onClick={() => setIsOpen(false)} className={`block text-lg font-semibold p-3 rounded-lg hover:bg-gray-100 ${pathname === link.href ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}>
                                                {link.name}
                                            </Link>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="p-6 border-t border-gray-200">
                                <ClientOnly><AuthNav /></ClientOnly>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}