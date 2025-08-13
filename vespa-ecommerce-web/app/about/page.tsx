// /app/about/page.tsx
'use client'; // <-- Wajib ditambahkan untuk menggunakan hooks dan event listener

import { motion } from 'framer-motion';
import { Wrench, Heart, Users, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

// Kita tidak bisa menggunakan 'export const metadata' di client component.
// Pindahkan ke layout.tsx atau biarkan Next.js menanganinya jika tidak krusial.

// Definisikan varian animasi untuk digunakan kembali
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2, // Memberi jeda antar animasi anak-anaknya
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
    },
  },
};

const slideInLeft = {
    hidden: { x: -100, opacity: 0 },
    show: { x: 0, opacity: 1, transition: { duration: 0.7, ease: "easeOut" } }
}

const slideInRight = {
    hidden: { x: 100, opacity: 0 },
    show: { x: 0, opacity: 1, transition: { duration: 0.7, ease: "easeOut" } }
}

export default function AboutPage() {
  return (
    <div className="bg-gray-50 min-h-screen pt-28 overflow-x-hidden"> {/* Mencegah horizontal scrollbar karena animasi */}
      <div className="container mx-auto px-4 py-16">
        <motion.div
          className="text-center max-w-3xl mx-auto"
          initial="hidden"
          animate="show"
          variants={containerVariants}
        >
          <motion.h1 
            className="text-4xl md:text-5xl font-extrabold text-[#1E2022] mb-4"
            variants={itemVariants}
          >
            Tentang Kami
          </motion.h1>
          <motion.p 
            className="text-lg text-gray-600"
            variants={itemVariants}
          >
            Kami adalah rumah bagi para pecinta Vespa. Didorong oleh hasrat yang sama, kami berdedikasi untuk menyediakan sparepart berkualitas tinggi agar skuter kebanggaan Anda selalu dalam kondisi prima.
          </motion.p>
        </motion.div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Gambar Ilustrasi dengan animasi */}
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={slideInLeft}
          >
            <img 
              src="https://images.unsplash.com/photo-1658397232100-343177fe408e?q=80&w=736&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" 
              alt="Vespa Klasik" 
              className="rounded-lg shadow-2xl w-full h-auto object-cover"
            />
          </motion.div>
          
          {/* Misi Kami dengan animasi */}
          <motion.div
            className="space-y-6"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={containerVariants}
          >
            <motion.h2 className="text-3xl font-bold text-gray-800" variants={itemVariants}>
                Misi Kami
            </motion.h2>
            <motion.p className="text-gray-700 leading-relaxed" variants={itemVariants}>
              Misi kami sederhana: menjadi sumber terpercaya untuk semua kebutuhan sparepart Vespa Anda. Kami percaya bahwa setiap Vespa memiliki cerita unik, dan kami ingin menjadi bagian dari perjalanan Anda dalam merawat dan melestarikan warisan skuter Italia ini.
            </motion.p>
            <motion.ul className="space-y-4" variants={containerVariants}>
              <motion.li className="flex items-start" variants={itemVariants}>
                <ShieldCheck className="h-6 w-6 text-green-600 mr-3 flex-shrink-0 mt-1" />
                <span><span className="font-semibold">Kualitas Terjamin:</span> Hanya menyediakan produk original dan aftermarket terbaik yang telah kami uji.</span>
              </motion.li>
              <motion.li className="flex items-start" variants={itemVariants}>
                <Wrench className="h-6 w-6 text-blue-600 mr-3 flex-shrink-0 mt-1" />
                <span><span className="font-semibold">Lengkap & Mudah:</span> Menawarkan katalog lengkap dengan navigasi yang mudah untuk menemukan part yang tepat.</span>
              </motion.li>
              <motion.li className="flex items-start" variants={itemVariants}>
                <Users className="h-6 w-6 text-orange-600 mr-3 flex-shrink-0 mt-1" />
                <span><span className="font-semibold">Mendukung Komunitas:</span> Membangun platform yang tidak hanya berjualan, tapi juga menjadi titik kumpul bagi komunitas.</span>
              </motion.li>
            </motion.ul>
          </motion.div>
        </div>

        {/* CTA Section dengan animasi */}
        <motion.div 
            className="mt-20 text-center bg-white p-12 rounded-lg shadow-lg"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6 }}
        >
          <Heart className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Siap Membuat Vespa Anda Sempurna?</h2>
          <p className="text-gray-600 max-w-2xl mx-auto mb-8">
            Jelajahi koleksi sparepart kami dan temukan apa yang Anda butuhkan untuk proyek restorasi atau perawatan rutin skuter Anda.
          </p>
          <Link href="/products" className="bg-[#52616B] text-white font-bold py-3 px-8 rounded-lg hover:bg-[#1E2022] transition-transform transform hover:scale-105 inline-block">
            Lihat Katalog Produk
          </Link>
        </motion.div>
      </div>
    </div>
  );
}