import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Home, Package, ShoppingCart, Users, CircleUser, Settings, Landmark, Link2, Menu, X } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { logoutUser } from '@/services/userService';

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = router.pathname;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logoutUser();
      toast.success('Anda berhasil logout.');
      router.push('/auth/login');
    } catch (error) {
      toast.error('Gagal logout, silakan coba lagi.');
      console.error('Logout failed:', error);
    }
  };

  const navItems = [
    { href: '/', label: 'Dashboard', icon: Home },
    { href: '/products', label: 'Produk', icon: Package },
    { href: '/categories', label: 'Kategori', icon: Package },
    { href: '/brands', label: 'Merek', icon: Package },
    { href: '/orders', label: 'Pesanan', icon: ShoppingCart },
    { href: '/users', label: 'Pengguna', icon: Users },
    { href: '/payment-mappings', label: 'Pemetaan Pembayaran', icon: Link2 },
    { href: '/settings', label: 'Pengaturan', icon: Settings },
  ];

  // Komponen Navigasi (Dipakai ulang untuk Desktop & Mobile agar konsisten)
  const NavContent = () => (
    <>
      <Link href="/" className="mb-8 flex items-center gap-2">
        <h1 className="text-2xl font-bold text-foreground">Jakartascootershop</h1>
      </Link>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            onClick={() => setIsMobileMenuOpen(false)} // Tutup menu saat link diklik (mobile)
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-foreground',
              (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))) && 'bg-secondary text-secondary-foreground',
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar Desktop (Tetap sama, hidden di mobile, flex di sm ke atas) */}
      <aside className="hidden w-64 flex-col border-r bg-card p-4 sm:flex">
        <NavContent />
      </aside>

      {/* --- Mobile Sidebar Overlay & Drawer (Hanya muncul di layar kecil) --- */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 sm:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-card p-4 shadow-lg transition-transform duration-300 ease-in-out sm:hidden",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex justify-end mb-4">
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <NavContent />
      </div>
      {/* ------------------------------------------------------------------ */}

      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-16 items-center border-b bg-card px-6">
          
          {/* Tombol Hamburger (Hanya visible di mobile / sm:hidden) */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="sm:hidden -ml-2 mr-2"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>

          {/* User Menu (Dirotasi ke kanan menggunakan ml-auto) */}
          <div className="ml-auto flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="rounded-full">
                  <CircleUser className="h-5 w-5" />
                  <span className="sr-only">Toggle user menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuItem>Support</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    handleLogout();
                  }}
                  className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}