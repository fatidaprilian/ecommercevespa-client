'use client';

import { motion } from 'framer-motion';
import { Archive, Clock, MapPin, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { useProfile } from '@/hooks/useProfile';

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1 },
};

export default function AkunSayaPage() {
  const { data: user, isLoading } = useProfile();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div>
        <h1 className="text-4xl font-bold text-gray-800 font-playfair">
          Selamat Datang, {user.name}!
        </h1>
        <p className="text-lg text-gray-600 mt-1">
          Ini adalah ringkasan aktivitas akun Anda.
        </p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <motion.div variants={itemVariants}>
            <Card className="h-full hover:shadow-lg transition-shadow">
                <CardHeader>
                <CardTitle className="flex items-center gap-3">
                    <Archive className="text-blue-500" />
                    <span>Pesanan Terbaru</span>
                </CardTitle>
                </CardHeader>
                <CardContent>
                <p className="text-gray-500 mb-4">Lihat status pesanan terakhir Anda atau seluruh riwayat pembelian.</p>
                <Link href="/orders" className="font-semibold text-blue-600 hover:underline">
                    Lihat Riwayat Pesanan &rarr;
                </Link>
                </CardContent>
            </Card>
        </motion.div>
        <motion.div variants={itemVariants}>
            <Card className="h-full hover:shadow-lg transition-shadow">
                <CardHeader>
                <CardTitle className="flex items-center gap-3">
                    <MapPin className="text-green-500" />
                    <span>Alamat Pengiriman</span>
                </CardTitle>
                </CardHeader>
                <CardContent>
                <p className="text-gray-500 mb-4">Kelola alamat pengiriman Anda untuk proses checkout yang lebih cepat.</p>
                <Link href="/profile/akun-saya/alamat" className="font-semibold text-green-600 hover:underline">
                    Kelola Alamat &rarr;
                </Link>
                </CardContent>
            </Card>
        </motion.div>
        <motion.div variants={itemVariants}>
          <Card className="h-full hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Clock className="text-orange-500" />
                <span>Bergabung Sejak</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-700">
                {new Date(user.createdAt).toLocaleDateString('id-ID', {
                  year: 'numeric',
                  month: 'long',
                })}
              </p>
              <p className="text-gray-500">Terima kasih atas kesetiaan Anda!</p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}