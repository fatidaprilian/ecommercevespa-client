// vespa-ecommerce-admin/pages/index.tsx
'use client'; // Diperlukan untuk Framer Motion

import { motion } from 'framer-motion';
import {
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  ArrowRight,
  PlusCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Data statistik (contoh)
const statsData = [
  {
    title: 'Total Produk',
    value: '1,250',
    icon: Package,
    color: 'text-blue-500',
    bgColor: 'bg-blue-100',
  },
  {
    title: 'Pesanan Baru',
    value: '82',
    icon: ShoppingCart,
    color: 'text-green-500',
    bgColor: 'bg-green-100',
  },
  {
    title: 'Total Pelanggan',
    value: '4,670',
    icon: Users,
    color: 'text-orange-500',
    bgColor: 'bg-orange-100',
  },
  {
    title: 'Pendapatan (Bulan Ini)',
    value: 'Rp 52.8M',
    icon: DollarSign,
    color: 'text-purple-500',
    bgColor: 'bg-purple-100',
  },
];

// Varian animasi untuk container utama
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15, // Memberi jeda animasi untuk setiap item di dalamnya
    },
  },
};

// Varian animasi untuk setiap item (kartu)
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } },
};

export default function DashboardPage() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* --- Header --- */}
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Dashboard Admin
        </h1>
        <p className="text-muted-foreground">
          Ringkasan aktivitas dan statistik terbaru dari toko Anda.
        </p>
      </motion.div>

      {/* --- Grid Kartu Statistik --- */}
      <motion.div
        variants={containerVariants}
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
      >
        {statsData.map((stat) => (
          <motion.div
            key={stat.title}
            variants={itemVariants}
            whileHover={{ y: -5, scale: 1.02 }} // Efek saat cursor di atas kartu
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <Card className="overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground pt-1">
                  Lihat Detail
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* --- Aksi Cepat & Aktivitas Terbaru --- */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Aksi Cepat */}
        <motion.div variants={itemVariants} className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Aksi Cepat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full justify-start">
                <Link href="/products/new">
                  <PlusCircle className="mr-2 h-4 w-4" /> Tambah Produk Baru
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/orders">
                  <ShoppingCart className="mr-2 h-4 w-4" /> Lihat Semua Pesanan
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Aktivitas Terbaru */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Aktivitas Terbaru</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Fitur aktivitas terbaru akan segera hadir di sini.
              </p>
              {/* Di sini Anda bisa menampilkan daftar pesanan terbaru atau log aktivitas admin */}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
