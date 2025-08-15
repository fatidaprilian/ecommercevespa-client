'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu, X, Search, ShoppingCart,
  Heart, ChevronDown, Package, Wrench, Zap, Sparkles, Tag // Impor 'Tag' sebagai ikon default
} from 'lucide-react';

import ClientOnly from '@/components/providers/ClientOnly';
import AuthNav from '@/components/molecules/AuthNav';
import { useCartStore } from '@/store/cart';

// [+] Definisikan tipe untuk data Kategori dari database Anda
interface Category {
  id: string;
  name: string;
}

// [+] Fungsi bantuan untuk memetakan nama kategori ke ikon
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
      return Tag; // Ikon default jika tidak ada yang cocok
  }
};

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  // [+] Tambahkan state untuk menyimpan data kategori dari API
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { cart } = useCartStore();
  const uniqueItemCount = cart?.items?.length || 0;

  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/register';

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    if (isAuthPage) {
      setIsScrolled(true);
    } else {
      handleScroll();
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [pathname, isAuthPage]);

  // [+] Tambahkan useEffect untuk mengambil data kategori saat komponen dimuat
  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading(true);
      try {
        // Pastikan endpoint ini ada di backend Anda
        const response = await fetch('/api/categories'); 
        if (!response.ok) {
          throw new Error('Gagal mengambil data kategori');
        }
        const data: Category[] = await response.json();
        setCategories(data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []); // Dijalankan sekali saat komponen pertama kali render

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
            {/* --- Bagian Logo (TIDAK BERUBAH) --- */}
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

            {/* --- Navigasi Desktop --- */}
            <div className="hidden md:flex items-center space-x-6">
              {navigationLinks.map((link) => (
                <div
                  key={link.name}
                  className="relative pb-4"
                  onMouseEnter={() => link.hasDropdown && setActiveDropdown(link.name)}
                  onMouseLeave={() => link.hasDropdown && setActiveDropdown(null)}
                >
                  <Link
                    href={link.href}
                    className={`text-sm font-medium transition-colors duration-300 flex items-center gap-1.5 group ${
                      pathname === link.href
                        ? textColorClass
                        : navIsSolid
                          ? 'text-gray-500 hover:text-[#1E2022]'
                          : 'text-gray-500 hover:text-white'
                    }`}
                  >
                    {link.name}
                    {link.hasDropdown && <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${activeDropdown === link.name ? 'rotate-180' : ''}`} />}
                  </Link>
                  <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-0 group-hover:w-full transition-all duration-300 ${pathname === link.href ? 'w-full' : ''} ${navIsSolid ? 'bg-[#1E2022]' : 'bg-white'}`}></div>

                  {/* [REVISI] Dropdown sekarang menampilkan Kategori dari API */}
                  {link.hasDropdown && activeDropdown === link.name && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full left-1/2 -translate-x-1/2 w-64 bg-white rounded-lg shadow-xl overflow-hidden"
                    >
                      <div className="p-4 grid grid-cols-1 gap-2">
                        {isLoading ? (
                           <div className="p-3 text-center text-gray-500">Loading...</div>
                        ) : (
                          categories.map((category) => {
                            const Icon = getCategoryIcon(category.name);
                            return (
                                <Link
                                    key={category.id}
                                    href={`/products?category=${encodeURIComponent(category.name)}`}
                                    className="flex items-center p-3 rounded-md text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                                >
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
            
            {/* --- Ikon Aksi (TIDAK BERUBAH) --- */}
            <div className={`flex items-center space-x-4 ${textColorClass}`}>
              <button className={`p-2 rounded-full transition-all duration-300 hover:scale-110 ${navIsSolid ? 'hover:bg-[#C9D6DF]/50 hover:text-[#52616B]' : 'hover:bg-white/10'}`}><Search className="w-5 h-5" /></button>
              <button className={`hidden sm:block p-2 rounded-full transition-all duration-300 hover:scale-110 ${navIsSolid ? 'hover:bg-[#C9D6DF]/50 hover:text-[#52616B]' : 'hover:bg-white/10'}`}><Heart className="w-5 h-5" /></button>
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
                <ClientOnly>
                  <AuthNav />
                </ClientOnly>
              </div>
              <button onClick={() => setIsOpen(!isOpen)} className={`md:hidden p-2 rounded-full transition-all duration-300 hover:scale-110 ${navIsSolid ? 'hover:bg-[#C9D6DF]/50 hover:text-[#52616B]' : 'hover:bg-white/10'}`}>
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* --- Mobile Menu (TIDAK BERUBAH KECUALI DROPDOWN) --- */}
      <AnimatePresence>
        {isOpen && (
           <div className="md:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
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
                <button onClick={() => setIsOpen(false)} className="p-2 -mr-2">
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>
              <div className="flex-grow p-6 space-y-4 overflow-y-auto">
                {navigationLinks.map((link) => (
                  <div key={link.name}>
                    {link.hasDropdown ? (
                      <div>
                        <button
                          onClick={() => setActiveDropdown(activeDropdown === link.name ? null : link.name)}
                          className="w-full flex justify-between items-center text-left text-lg font-semibold text-gray-700 p-3 rounded-lg hover:bg-gray-100"
                        >
                          {link.name}
                          <ChevronDown className={`w-5 h-5 transition-transform ${activeDropdown === link.name ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {activeDropdown === link.name && (
                            <motion.div
                              initial="collapsed"
                              animate="open"
                              exit="collapsed"
                              variants={{ open: { opacity: 1, height: 'auto' }, collapsed: { opacity: 0, height: 0 } }}
                              transition={{ duration: 0.3, ease: 'easeInOut' }}
                              className="overflow-hidden pl-4 mt-2"
                            >
                              {/* [REVISI] Dropdown mobile sekarang juga menampilkan Kategori */}
                              {isLoading ? (
                                <div className="p-3 text-gray-500">Loading...</div>
                              ) : (
                                categories.map(category => {
                                  const Icon = getCategoryIcon(category.name);
                                  return (
                                    <Link
                                        key={category.id}
                                        href={`/products?category=${encodeURIComponent(category.name)}`}
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center p-3 rounded-lg text-gray-600 hover:bg-gray-100"
                                    >
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
                <ClientOnly>
                  <AuthNav />
                </ClientOnly>
              </div>
            </motion.div>
           </div>
        )}
      </AnimatePresence>
    </>
  );
}