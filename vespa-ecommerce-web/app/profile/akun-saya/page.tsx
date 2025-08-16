// file: app/profile/akun-saya/page.tsx
'use client';

import { useAuthStore } from '@/store/auth';
import { motion } from 'framer-motion';
import { Archive, User } from 'lucide-react';
import Link from 'next/link';

export default function AkunSayaPage() {
  const { user } = useAuthStore();

  if (!user) {
    return null; // Tampilkan loading atau redirect jika diperlukan
  }

  return (
    <div className="bg-gray-100 min-h-screen pt-28">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-800 font-playfair">
            Akun Saya
          </h1>
          <p className="text-lg text-gray-600">
            Selamat datang kembali, {user.name}! Kelola akun dan pesanan Anda di sini.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.1 }}
        >
          {/* Card Pesanan Saya */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.1 }}
          >
            <Link href="/orders" className="block">
              <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition-all text-center">
                <Archive className="mx-auto h-12 w-12 text-blue-500 mb-4" />
                <h3 className="font-bold text-xl text-gray-800">Pesanan Saya</h3>
                <p className="text-gray-500 text-sm mt-1">Lihat riwayat pesanan Anda</p>
              </div>
            </Link>
          </motion.div>

          {/* Placeholder Card Akun */}
          <motion.div
             variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.2 }}
          >
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <User className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h3 className="font-bold text-xl text-gray-800">Detail Akun</h3>
              <p className="text-gray-500 text-sm mt-1">Kelola informasi akun Anda</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}