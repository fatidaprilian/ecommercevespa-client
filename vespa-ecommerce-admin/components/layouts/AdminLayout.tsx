import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
// --- 1. TAMBAHKAN IKON BARU (Link2) ---
import { Home, Package, ShoppingCart, Users, CircleUser, Settings, Landmark, Link2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Helper untuk menggabungkan class CSS dengan lebih mudah
function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = router.pathname;

  const navItems = [
    { href: '/', label: 'Dashboard', icon: Home },
    { href: '/products', label: 'Produk', icon: Package },
    { href: '/categories', label: 'Kategori', icon: Package },
    { href: '/brands', label: 'Merek', icon: Package },
    { href: '/orders', label: 'Pesanan', icon: ShoppingCart },
    { href: '/users', label: 'Pengguna', icon: Users },
    { href: '/payment-methods', label: 'Metode Pembayaran', icon: Landmark },
    // --- 2. TAMBAHKAN ITEM MENU BARU DI SINI ---
    { href: '/payment-mappings', label: 'Pemetaan Pembayaran', icon: Link2 },
    { href: '/settings', label: 'Pengaturan', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-card p-4 sm:flex">
        <Link href="/" className="mb-8 flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">Vespa Admin</h1>
        </Link>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-foreground',
                // Cek path agar menu aktif yang dipilih lebih akurat
                (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))) && 'bg-secondary text-secondary-foreground',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-card px-6">
          <h2 className="text-xl font-semibold text-foreground">
            {navItems.find(item => pathname.startsWith(item.href))?.label || 'Dashboard'}
          </h2>
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
              <DropdownMenuItem>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}