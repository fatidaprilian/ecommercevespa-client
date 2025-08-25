'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutDashboard, User, MapPin, Archive, Heart } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/profile/akun-saya', label: 'Overview', icon: LayoutDashboard },
  { href: '/profile/akun-saya/profil', label: 'Profil Saya', icon: User },
  { href: '/profile/akun-saya/alamat', label: 'Daftar Alamat', icon: MapPin },
  { href: '/orders', label: 'Pesanan Saya', icon: Archive },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 },
};

export function SidebarNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6"
    >
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 rounded-full flex items-center justify-center bg-[#52616B] text-white font-bold text-3xl">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-bold text-lg text-gray-800">{user?.name}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
        </div>
      </div>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <motion.div key={item.href} variants={itemVariants}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-all',
                  isActive
                    ? 'bg-[#52616B] text-white shadow-md'
                    : 'text-gray-600 hover:bg-[#C9D6DF]/50 hover:text-[#1E2022]'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            </motion.div>
          );
        })}
      </nav>
    </motion.div>
  );
}