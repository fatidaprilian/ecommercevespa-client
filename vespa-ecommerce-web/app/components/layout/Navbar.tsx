// app/components/layout/Navbar.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Menu,
    X,
    Search,
    ShoppingCart,
    ChevronDown,
    Package,
    Wrench,
    Zap,
    Sparkles,
    Tag,
    Loader2,
    ArrowRight,
    Heart,
    Phone,
    User, // ✅ DITAMBAHKAN
} from 'lucide-react';

import api from '@/lib/api';
import { useCartStore } from '@/store/cart';
import { useCategories } from '@/hooks/use-categories';
import { Category, Product } from '@/types';

import ClientOnly from '@/components/providers/ClientOnly';
import AuthNav from '@/components/molecules/AuthNav';
import { Separator } from '../ui/separator';

const getCategoryIcon = (categoryName: string) => {
    switch (categoryName.toLowerCase()) {
        case 'engine parts':
            return Wrench;
        case 'body & frame':
            return Package;
        case 'electrical':
            return Zap;
        case 'accessories':
            return Sparkles;
        default:
            return Tag;
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
    const navRef = useRef<HTMLElement>(null);
    const topBarRef = useRef<HTMLDivElement>(null);
    const [headerHeight, setNavHeight] = useState(0);

    const router = useRouter();
    const pathname = usePathname();

    const { data: categoriesResponse, isLoading: isLoadingCategories } = useCategories({ limit: 4 });
    const categories = categoriesResponse?.data;

    const { cart } = useCartStore();
    const uniqueItemCount = cart?.items?.length || 0;

    useEffect(() => {
        const handleScroll = () => {
            const topBarHeight = topBarRef.current?.offsetHeight || 0;
            if (window.scrollY > topBarHeight) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        if (navRef.current) {
            setNavHeight(navRef.current.offsetHeight);
        }

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        setIsOpen(false);
        setIsSearchOpen(false);
    }, [pathname]);

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
                const { data } = await api.get('/products/search', {
                    params: { term: searchQuery },
                });
                setSearchResults(data);
            } catch (error) {
                console.error('Search failed:', error);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(debounceTimeout);
    }, [searchQuery]);

    const handleSearchSelect = (productId: string) => {
        router.push(`/products/${productId}`);
        setIsSearchOpen(false);
        setSearchQuery('');
        setSearchResults([]);
    };

    const navigationLinks = [
        { name: 'Produk', href: '/products', hasDropdown: true },
        { name: 'Kontak', href: '/contact' },
        { name: 'Pesanan', href: '/orders' },
    ];

    const textColorClass = 'text-[#1E2022]';

    return (
        <>
            <header className="relative z-50">
                {/* Top bar oranye (statis) */}
                <div ref={topBarRef} className="bg-[#f04e23] text-white">
                    <div className="container mx-auto px-6 h-14 flex items-center justify-between">
                        <div className="flex items-center space-x-6 text-sm font-medium">
                            <a
                                href="https://wa.me/628131010025"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 hover:text-gray-300 transition-colors"
                            >
                                <Phone size={32} />
                                <span>+628131010025</span>
                            </a>
                        </div>
                        <div className="flex items-center gap-1">
                            <Link
                                href="/profile/akun-saya/wishlist"
                                className="relative p-2 rounded-full transition-colors duration-300 hover:bg-black/10"
                            >
                                <Heart className="w-6 h-6" />
                            </Link>
                            <div className="text-white [&_button]:text-white [&_button:hover]:bg-black/10 [&_a]:text-white [&_a:hover]:bg-black/10">
                                <ClientOnly>
                                    <AuthNav />
                                </ClientOnly>
                            </div>
                            <Link
                                href="/cart"
                                className="relative p-2 rounded-full transition-colors duration-300 hover:bg-black/10"
                            >
                                <ShoppingCart className="w-6 h-6" />
                                <ClientOnly>
                                    {uniqueItemCount > 0 && (
                                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-[#f04e23] text-xs rounded-full flex items-center justify-center font-bold">
                                            {uniqueItemCount}
                                        </span>
                                    )}
                                </ClientOnly>
                            </Link>
                        </div>
                    </div>
                </div>

                <motion.nav
                    ref={navRef}
                    animate={{ height: isScrolled ? 80 : 112 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className={`left-0 right-0 w-full bg-white/95 backdrop-blur-md border-b border-gray-200/50
                        ${isScrolled ? 'fixed top-0 shadow-lg' : 'relative shadow-sm'}
                    `}
                >
                    <div className="container mx-auto px-6 h-full">
                        <div className="flex items-center justify-between h-full gap-6">
                            <Link href="/" className="flex-shrink-0 flex items-center space-x-3 group">
                                <motion.div
                                    animate={{
                                        width: isScrolled ? 96 : 120,
                                        height: isScrolled ? 96 : 120,
                                    }}
                                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                                >
                                    <Image
                                        src="/JSSLogo.svg"
                                        alt="JSS Logo"
                                        width={120}
                                        height={120}
                                        className="group-hover:scale-110 transition-transform duration-300"
                                    />
                                </motion.div>
                            </Link>

                            <div className="relative w-full max-w-lg hidden md:block">
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Cari produk..."
                                    className="w-full h-12 pl-5 pr-12 rounded-full text-base border transition-colors bg-gray-100 border-gray-200 text-black placeholder-gray-400 focus:ring-primary/50 focus:outline-none focus:ring-2"
                                />
                                <div className="absolute top-0 right-0 h-full flex items-center pr-3 pointer-events-none">
                                    <Search className="w-6 h-6 text-gray-400" />
                                </div>
                                {(searchResults.length > 0 || isSearching) &&
                                    searchQuery.length > 1 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="absolute top-14 left-0 w-full bg-white rounded-lg shadow-lg border flex flex-col z-20"
                                        >
                                            <div className="max-h-80 overflow-y-auto">
                                                {isSearching && (
                                                    <div className="flex items-center justify-center p-4 text-sm text-gray-500">
                                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                        Mencari...
                                                    </div>
                                                )}
                                                {!isSearching &&
                                                    searchResults.map((product: Product) => (
                                                        <button
                                                            key={product.id}
                                                            onClick={() =>
                                                                handleSearchSelect(product.id)
                                                            }
                                                            className="w-full text-left flex items-center gap-3 p-3 hover:bg-gray-100 transition-colors"
                                                        >
                                                            <img
                                                                src={
                                                                    product.images?.[0]?.url ||
                                                                    'https://placehold.co/100x100'
                                                                }
                                                                alt={product.name}
                                                                className="w-10 h-10 object-cover rounded-md flex-shrink-0"
                                                            />
                                                            <span className="text-sm text-gray-800">
                                                                {product.name}
                                                            </span>
                                                        </button>
                                                    ))}
                                            </div>
                                            {!isSearching && searchResults.length > 0 && (
                                                <Link
                                                    href={`/products?search=${searchQuery}`}
                                                    onClick={() => {
                                                        setSearchQuery('');
                                                        setSearchResults([]);
                                                    }}
                                                    className="block w-full text-center p-3 border-t bg-gray-50 hover:bg-gray-100 text-sm font-semibold text-blue-600"
                                                >
                                                    Lihat Semua Hasil
                                                </Link>
                                            )}
                                        </motion.div>
                                    )}
                            </div>

                            <div
                                className={`flex items-center space-x-2 md:space-x-4 ${textColorClass}`}
                            >
                                <div className="hidden md:flex items-center space-x-4">
                                    {navigationLinks.map((link) => (
                                        <div
                                            key={link.name}
                                            className="relative group"
                                            onMouseEnter={() =>
                                                link.hasDropdown &&
                                                setActiveDropdown(link.name)
                                            }
                                            onMouseLeave={() =>
                                                link.hasDropdown && setActiveDropdown(null)
                                            }
                                        >
                                            <Link
                                                href={link.href}
                                                className={`text-xl font-medium transition-colors duration-300 flex items-center gap-1.5 pb-1 ${
                                                    pathname === link.href
                                                        ? textColorClass
                                                        : 'text-gray-500 hover:text-[#1E2022]'
                                                }`}
                                            >
                                                {link.name}
                                                {link.hasDropdown && (
                                                    <ChevronDown
                                                        className={`w-4 h-4 transition-transform duration-300 ${
                                                            activeDropdown === link.name
                                                                ? 'rotate-180'
                                                                : ''
                                                        }`}
                                                    />
                                                )}
                                            </Link>
                                            <div
                                                className={`absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-300 bg-[#1E2022] ${
                                                    pathname === link.href ? 'w-full' : ''
                                                }`}
                                            ></div>

                                            {link.hasDropdown &&
                                                activeDropdown === link.name && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: 10 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="absolute top-full pt-4 left-1/2 -translate-x-1/2 w-64"
                                                    >
                                                        <div className="bg-white rounded-lg shadow-xl overflow-hidden p-2">
                                                            {isLoadingCategories ? (
                                                                <div className="p-3 text-center text-gray-500">
                                                                    Memuat...
                                                                </div>
                                                            ) : (
                                                                categories?.map(
                                                                    (
                                                                        category: Category,
                                                                    ) => {
                                                                        const Icon =
                                                                            getCategoryIcon(
                                                                                category.name,
                                                                            );
                                                                        return (
                                                                            <Link
                                                                                key={category.id}
                                                                                href={`/products?categoryId=${category.id}`}
                                                                                className="flex items-center p-3 rounded-md text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                                                                            >
                                                                                <Icon className="w-5 h-5 mr-3 text-[#52616B]" />
                                                                                <span className="font-medium">
                                                                                    {
                                                                                        category.name
                                                                                    }
                                                                                </span>
                                                                            </Link>
                                                                        );
                                                                    },
                                                                )
                                                            )}
                                                            <Separator className="my-1" />
                                                            <Link
                                                                href="/products"
                                                                className="flex items-center justify-center p-3 rounded-md text-blue-600 font-semibold hover:bg-blue-50 transition-colors duration-200"
                                                            >
                                                                Lihat Semua Kategori
                                                                <ArrowRight className="w-4 h-4 ml-2" />
                                                            </Link>
                                                        </div>
                                                    </motion.div>
                                                )}
                                        </div>
                                    ))}
                                </div>

                                <AnimatePresence>
                                    {isScrolled && (
                                        <motion.div
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            transition={{ duration: 0.3 }}
                                            className="hidden md:flex items-center gap-1 text-gray-600"
                                        >
                                            <Link
                                                href="/profile/akun-saya/wishlist"
                                                className="relative p-2 rounded-full transition-colors duration-300 hover:bg-gray-100"
                                            >
                                                <Heart className="w-6 h-6" />
                                            </Link>
                                            <div className="text-white [&_button]:text-white [&_button:hover]:bg-black/10 [&_a]:text-white [&_a:hover]:bg-black/10">
                                                <ClientOnly>
                                                    <AuthNav />
                                                </ClientOnly>
                                            </div>
                                            <Link
                                                href="/cart"
                                                className="relative p-2 rounded-full transition-colors duration-300 hover:bg-gray-100"
                                            >
                                                <ShoppingCart className="w-6 h-6" />
                                                <ClientOnly>
                                                    {uniqueItemCount > 0 && (
                                                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#f04e23] text-white text-xs rounded-full flex items-center justify-center font-bold">
                                                            {uniqueItemCount}
                                                        </span>
                                                    )}
                                                </ClientOnly>
                                            </Link>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Tombol Menu Mobile */}
                                <button
                                    onClick={() => setIsOpen(!isOpen)}
                                    className="md:hidden p-2 rounded-full transition-all duration-300 hover:bg-gray-100"
                                >
                                    {isOpen ? (
                                        <X className="w-6 h-6" />
                                    ) : (
                                        <Menu className="w-6 h-6" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.nav>
                {isScrolled && <div style={{ height: `${headerHeight}px` }} />}
            </header>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isOpen && (
                    <div
                        className="md:hidden fixed inset-0 z-60 bg-black/30 backdrop-blur-sm"
                        onClick={() => setIsOpen(false)}
                    >
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
                            onClick={(e) => e.stopPropagation()}
                            className="absolute top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl flex flex-col"
                        >
                            <div className="p-6 flex justify-between items-center border-b border-gray-200">
                                <h2 className="text-xl font-bold text-[#1E2022]">Menu</h2>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 -mr-2"
                                >
                                    <X className="w-6 h-6 text-gray-500" />
                                </button>
                            </div>

                            <div className="flex-grow p-6 space-y-2 overflow-y-auto">
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        if (searchQuery.length > 1) {
                                            router.push(
                                                `/products?search=${searchQuery}`,
                                            );
                                            setIsOpen(false);
                                        }
                                    }}
                                    className="relative w-full mb-4"
                                >
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) =>
                                            setSearchQuery(e.target.value)
                                        }
                                        placeholder="Cari produk..."
                                        className="w-full h-11 pl-4 pr-10 rounded-full text-base border transition-colors bg-gray-100 border-gray-200 text-black placeholder-gray-400 focus:ring-primary/50 focus:outline-none focus:ring-2"
                                    />
                                    <button
                                        type="submit"
                                        className="absolute top-0 right-0 h-full flex items-center pr-4"
                                    >
                                        <Search className="w-5 h-5 text-gray-400" />
                                    </button>
                                </form>

                                <Separator className="mb-2" />

                                {navigationLinks.map((link) => (
                                    <div key={link.name}>
                                        {link.hasDropdown ? (
                                            <div>
                                                <div className="w-full flex justify-between items-center text-left text-lg font-semibold text-gray-700 p-3 rounded-lg hover:bg-gray-100">
                                                    <Link
                                                        href={link.href}
                                                        onClick={() =>
                                                            setIsOpen(false)
                                                        }
                                                        className="flex-grow"
                                                    >
                                                        {link.name}
                                                    </Link>
                                                    <button
                                                        onClick={() =>
                                                            setActiveDropdown(
                                                                activeDropdown ===
                                                                    link.name
                                                                    ? null
                                                                    : link.name,
                                                            )
                                                        }
                                                        className="p-2 -mr-2"
                                                    >
                                                        <ChevronDown
                                                            className={`w-5 h-5 transition-transform ${
                                                                activeDropdown ===
                                                                link.name
                                                                    ? 'rotate-180'
                                                                    : ''
                                                            }`}
                                                        />
                                                    </button>
                                                </div>

                                                <AnimatePresence>
                                                    {activeDropdown ===
                                                        link.name && (
                                                        <motion.div
                                                            initial="collapsed"
                                                            animate="open"
                                                            exit="collapsed"
                                                            variants={{
                                                                open: {
                                                                    opacity: 1,
                                                                    height: 'auto',
                                                                },
                                                                collapsed: {
                                                                    opacity: 0,
                                                                    height: 0,
                                                                },
                                                            }}
                                                            transition={{
                                                                duration: 0.3,
                                                                ease: 'easeInOut',
                                                            }}
                                                            className="overflow-hidden pl-6 mt-1"
                                                        >
                                                            {isLoadingCategories ? (
                                                                <div className="p-3 text-gray-500">
                                                                    Memuat...
                                                                </div>
                                                            ) : (
                                                                categories?.map(
                                                                    (category) => {
                                                                        const Icon =
                                                                            getCategoryIcon(
                                                                                category.name,
                                                                            );
                                                                        return (
                                                                            <Link
                                                                                key={
                                                                                    category.id
                                                                                }
                                                                                href={`/products?categoryId=${category.id}`}
                                                                                onClick={() =>
                                                                                    setIsOpen(
                                                                                        false,
                                                                                    )
                                                                                }
                                                                                className="flex items-center p-3 rounded-lg text-gray-600 hover:bg-gray-100"
                                                                            >
                                                                                <Icon className="w-5 h-5 mr-3 text-gray-400" />
                                                                                {
                                                                                    category.name
                                                                                }
                                                                            </Link>
                                                                        );
                                                                    },
                                                                )
                                                            )}
                                                            <Separator className="my-1" />
                                                            <Link
                                                                href="/products"
                                                                onClick={() =>
                                                                    setIsOpen(
                                                                        false,
                                                                    )
                                                                }
                                                                className="flex items-center justify-center p-3 rounded-md text-blue-600 font-semibold hover:bg-blue-50 transition-colors duration-200"
                                                            >
                                                                Lihat Semua
                                                                Kategori
                                                                <ArrowRight className="w-4 h-4 ml-2" />
                                                            </Link>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        ) : (
                                            <Link
                                                href={link.href}
                                                onClick={() => setIsOpen(false)}
                                                className={`block text-lg font-semibold p-3 rounded-lg hover:bg-gray-100 ${
                                                    pathname === link.href
                                                        ? 'text-blue-600 bg-blue-50'
                                                        : 'text-gray-700'
                                                }`}
                                            >
                                                {link.name}
                                            </Link>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* ✅ BAGIAN BAWAH MOBILE: AKUN + KERANJANG + AUTHNAV */}
                            <div className="p-6 border-t border-gray-200 space-y-4">
                                <div className="flex items-center justify-between gap-3">
                                    <Link
                                        href="/profile/akun-saya"
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-gray-50 text-gray-800 text-sm font-medium hover:bg-gray-100"
                                    >
                                        <User className="w-5 h-5" />
                                        <span>Akun Saya</span>
                                    </Link>

                                    <Link
                                        href="/cart"
                                        onClick={() => setIsOpen(false)}
                                        className="relative flex items-center justify-center w-11 h-11 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100"
                                    >
                                        <ShoppingCart className="w-5 h-5 text-gray-800" />
                                        <ClientOnly>
                                            {uniqueItemCount > 0 && (
                                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#f04e23] text-white text-xs rounded-full flex items-center justify-center font-bold">
                                                    {uniqueItemCount}
                                                </span>
                                            )}
                                        </ClientOnly>
                                    </Link>
                                </div>

                                <div>
                                    <ClientOnly>
                                        <AuthNav />
                                    </ClientOnly>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
