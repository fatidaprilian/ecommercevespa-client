import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Home, Package, ShoppingCart, Users, CircleUser, Settings, Landmark, Link2 } from 'lucide-react';
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
                (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))) && 'bg-secondary text-secondary-foreground',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-end border-b bg-card px-6">
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
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}