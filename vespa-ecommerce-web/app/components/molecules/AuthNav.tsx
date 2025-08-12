'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { 
  User, LogOut, UserPlus, Menu, X, Search, ShoppingCart, 
  Heart, Phone, ChevronDown, Package, Wrench, Zap, Sparkles
} from 'lucide-react';
import { useAuthStore } from '@/store/auth'; // Menggunakan store asli

// Komponen untuk navigasi otentikasi (Login, Register, Logout)
export const AuthNav = () => {
    const { user, isAuthenticated, setUser } = useAuthStore();

    const handleLogout = async () => {
        // Di sini Anda bisa menambahkan logika untuk memanggil API logout
        setUser(null);
    };

    if (isAuthenticated && user) {
        return (
            <div className="flex items-center space-x-4">
                {/* Perbaikan: Menghapus template literal yang salah */}
                <span className="hidden sm:inline">Halo, {user.name}!</span>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full text-sm font-semibold transition-all transform hover:scale-105"
                >
                    <LogOut className="w-4 h-4" />
                    Logout
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center space-x-2">
            <Link href="/login" className="flex items-center gap-2 hover:bg-gray-500/10 px-4 py-2 rounded-full text-sm font-semibold transition-all">
                <User className="w-4 h-4" />
                Login
            </Link>
            <Link href="/register" className="hidden sm:flex items-center gap-2 bg-[#52616B] text-white hover:bg-[#1E2022] px-4 py-2 rounded-full text-sm font-semibold transition-all transform hover:scale-105">
                <UserPlus className="w-4 h-4" />
                Register
            </Link>
        </div>
    );
};

// Komponen Navbar Utama
const PremiumNavbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [cartCount] = useState(3); // Ganti dengan data dari store

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const categories = [
    { name: 'Engine Parts', icon: Wrench, href: '/products?category=engine' },
    { name: 'Body & Frame', icon: Package, href: '/products?category=body' },
    { name: 'Electrical', icon: Zap, href: '/products?category=electrical' },
    { name: 'Accessories', icon: Sparkles, href: '/products?category=accessories' }
  ];

  const navigationLinks = [
    { name: 'Home', href: '/' },
    { name: 'Products', href: '/products', hasDropdown: true },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' }
  ];

  // Menentukan warna teks berdasarkan state isScrolled
  const textColorClass = isScrolled ? 'text-[#1E2022]' : 'text-white';

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled 
            ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200/50' 
            : 'bg-[#1E2022]/20 backdrop-blur-md' // Latar belakang baru saat di atas
        }`}
      >
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-[#52616B] to-[#1E2022] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#C9D6DF] rounded-full border-2 border-white"></div>
              </div>
              <div className="hidden sm:block">
                <h1 className={`text-2xl font-bold transition-colors duration-300 ${isScrolled ? 'text-[#1E2022]' : 'text-white'}`} style={{ fontFamily: "'Playfair Display', serif" }}>
                  VespaParts
                </h1>
                <p className={`text-xs transition-colors duration-300 ${isScrolled ? 'text-gray-500' : 'text-white/80'}`}>
                  Authentic Heritage
                </p>
              </div>
            </Link>

            {/* Navigasi Desktop */}
            <div className={`hidden lg:flex items-center space-x-8 ${textColorClass}`}>
              {navigationLinks.map((link) => (
                <div key={link.name} className="relative">
                  {link.hasDropdown ? (
                    <button
                      onMouseEnter={() => setActiveDropdown(link.name)}
                      onMouseLeave={() => setActiveDropdown(null)}
                      className={`flex items-center gap-1 px-4 py-2 rounded-full font-semibold transition-all duration-300 hover:scale-105 ${isScrolled ? 'hover:text-[#52616B] hover:bg-[#C9D6DF]/50' : 'hover:text-white hover:bg-white/10'}`}
                    >
                      {link.name}
                      <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === link.name ? 'rotate-180' : ''}`} />
                    </button>
                  ) : (
                    <Link href={link.href} className={`px-4 py-2 rounded-full font-semibold transition-all duration-300 hover:scale-105 ${isScrolled ? 'hover:text-[#52616B] hover:bg-[#C9D6DF]/50' : 'hover:text-white hover:bg-white/10'}`}>
                      {link.name}
                    </Link>
                  )}

                  {link.hasDropdown && (
                    <AnimatePresence>
                      {activeDropdown === link.name && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ duration: 0.2 }}
                          onMouseEnter={() => setActiveDropdown(link.name)}
                          onMouseLeave={() => setActiveDropdown(null)}
                          className="absolute text-gray-700 top-full left-0 mt-2 w-64 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden"
                        >
                          <div className="p-4">
                            <p className="text-sm text-gray-500 mb-4 font-medium">Browse by Category</p>
                            <div className="space-y-2">
                              {categories.map((category) => (
                                <Link key={category.name} href={category.href} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#C9D6DF]/50 transition-all group">
                                  <div className="p-2 bg-[#C9D6DF]/50 rounded-lg group-hover:bg-[#52616B] group-hover:text-white transition-all">
                                    <category.icon className="w-4 h-4" />
                                  </div>
                                  <span className="font-medium text-[#1E2022] group-hover:text-[#52616B]">{category.name}</span>
                                </Link>
                              ))}
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <Link href="/products" className="block text-center py-2 px-4 bg-[#52616B] text-white rounded-lg font-semibold hover:bg-[#1E2022] transition-colors">
                                View All Products
                              </Link>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </div>
              ))}
            </div>

            {/* Aksi Sebelah Kanan */}
            <div className={`flex items-center space-x-4 ${textColorClass}`}>
              <button className={`p-2 rounded-full transition-all duration-300 hover:scale-110 ${isScrolled ? 'hover:bg-[#C9D6DF]/50 hover:text-[#52616B]' : 'hover:bg-white/10'}`}>
                <Search className="w-5 h-5" />
              </button>
              <button className={`hidden sm:block p-2 rounded-full transition-all duration-300 hover:scale-110 ${isScrolled ? 'hover:bg-[#C9D6DF]/50 hover:text-[#52616B]' : 'hover:bg-white/10'}`}>
                <Heart className="w-5 h-5" />
              </button>
              <Link href="/cart" className={`relative p-2 rounded-full transition-all duration-300 hover:scale-110 ${isScrolled ? 'hover:bg-[#C9D6DF]/50 hover:text-[#52616B]' : 'hover:bg-white/10'}`}>
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{cartCount}</span>
                )}
              </Link>
              <div className="hidden md:block">
                <AuthNav />
              </div>
              <button onClick={() => setIsOpen(!isOpen)} className={`lg:hidden p-2 rounded-full transition-all duration-300 hover:scale-110 ${isScrolled ? 'hover:bg-[#C9D6DF]/50 hover:text-[#52616B]' : 'hover:bg-white/10'}`}>
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Menu Mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 lg:hidden"
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="absolute right-0 top-0 h-full w-80 bg-[#F0F5F9] shadow-2xl overflow-y-auto"
            >
              <div className="p-6 pt-24">
                <div className="mb-8 pb-6 border-b border-[#C9D6DF]">
                  <AuthNav />
                </div>
                <div className="space-y-6">
                  {navigationLinks.map((link) => (
                    <div key={link.name}>
                      <Link href={link.href} onClick={() => setIsOpen(false)} className="block py-3 text-lg font-semibold text-[#1E2022] hover:text-[#52616B] transition-colors">
                        {link.name}
                      </Link>
                      {link.hasDropdown && (
                        <div className="ml-4 mt-2 space-y-2">
                          {categories.map((category) => (
                            <Link key={category.name} href={category.href} onClick={() => setIsOpen(false)} className="flex items-center gap-3 py-2 text-gray-600 hover:text-[#52616B] transition-colors">
                              <category.icon className="w-4 h-4" />
                              {category.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-8 pt-6 border-t border-[#C9D6DF]">
                  <div className="flex items-center justify-around">
                    <button className="flex flex-col items-center gap-2 text-gray-600 hover:text-[#52616B] transition-colors">
                      <Search className="w-6 h-6" />
                      <span className="text-xs">Search</span>
                    </button>
                    <button className="flex flex-col items-center gap-2 text-gray-600 hover:text-[#52616B] transition-colors">
                      <Heart className="w-6 h-6" />
                      <span className="text-xs">Wishlist</span>
                    </button>
                    <Link href="/cart" className="flex flex-col items-center gap-2 text-gray-600 hover:text-[#52616B] transition-colors relative">
                      <ShoppingCart className="w-6 h-6" />
                      <span className="text-xs">Cart</span>
                      {cartCount > 0 && (
                        <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{cartCount}</span>
                      )}
                    </Link>
                  </div>
                </div>
                <div className="mt-8 pt-6 border-t border-[#C9D6DF]">
                  <div className="flex items-center gap-3 text-gray-600 mb-4">
                    <Phone className="w-5 h-5" />
                    <div>
                      <p className="text-sm font-semibold">Need Help?</p>
                      <p className="text-sm">+62 123 456 7890</p>
                    </div>
                  </div>
                  <button className="w-full bg-[#52616B] text-white py-3 rounded-lg font-semibold hover:bg-[#1E2022] transition-colors">
                    Free Consultation
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default PremiumNavbar;
