// vespa-ecommerce-web/app/layout.tsx

import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/components/providers/QueryProvider';
import ConditionalNavbar from '@/components/layout/ConditionalNavbar';
import { Toaster } from 'sonner';
import ClientOnly from '@/components/providers/ClientOnly';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Instagram, Phone } from 'lucide-react';
// Tidak perlu import Image karena kita tetap menggunakan <img>

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });

export const metadata: Metadata = {
    title: 'Vespa Sparepart Ecommerce',
    description: 'Temukan sparepart Vespa original dan berkualitas.',
};

// --- Komponen Footer Telah Direvisi ---
const Footer = () => {
  return (
    <footer className="bg-[#2b2b2b] text-white">
      <div className="container mx-auto px-6 lg:px-8 py-8">
        
        {/* Bagian Atas: Kontak */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 border-b border-gray-600 pb-6 mb-6 text-center">
            <h3 className="text-2xl font-semibold tracking-wider">Hubungi Kami</h3>
            <a
                href="https://wa.me/628159922321"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 hover:text-gray-300 transition-colors text-xl"
            >
                <Phone size={26} />
                <span>+628159922321</span>
            </a>
            <a
                href="https://instagram.com/jakartascootershop"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 hover:text-gray-300 transition-colors text-xl"
            >
                <Instagram size={26} />
                <span>JAKARTASCOOTERSHOP</span>
            </a>
        </div>

        {/* Bagian Tengah: Shipping, Pembayaran, Informasi */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          
        {/* Kolom 1: Shipping */}
        <div>
            <h3 className="font-bold text-lg mb-4 tracking-wider">PENGIRIMAN</h3>
            {/* Ganti grid dengan flexbox untuk alignment yang lebih baik */}
            <div className="flex items-center gap-4 max-w-[350px]">
                {/* Atur tinggi yang sama untuk semua logo, lebar akan menyesuaikan */}
                <img 
                    src="/jne.svg" 
                    alt="Logo JNE" 
                    className="h-10 w-auto" // Tinggi 32px, lebar otomatis
                />
                <img 
                    src="/jnt.png" 
                    alt="Logo J&T" 
                    className="h-10 w-auto" // Beri tinggi sedikit lebih besar jika perlu
                />
            </div>
        </div>

          {/* Kolom 2: Pembayaran */}
          <div>
            <h3 className="font-bold text-lg mb-4 tracking-wider">PEMBAYARAN</h3>
            <div className="grid grid-cols-2 gap-3 max-w-[350px]">
                <img src="/bca.svg" alt="Logo BCA" />
                <img src="/mandiri.svg" alt="Logo MANDIRI" />
                <img src="/mid.svg" alt="Logo MIDTRANS" />
            </div>
          </div>

          {/* Kolom 3: Informasi */}
          <div>
            <h3 className="font-bold text-lg mb-4 tracking-wider">INFORMASI</h3>
            {/* --- PENAMBAHAN LINK DI SINI --- */}
            <ul className="space-y-3">
              <li><Link href="/about" className="text-gray-400 hover:text-white transition-colors text-sm">Tentang Kami</Link></li>
              <li><Link href="/faq" className="text-gray-400 hover:text-white transition-colors text-sm">FAQ</Link></li>
              <li><Link href="/terms-and-conditions" className="text-gray-400 hover:text-white transition-colors text-sm">Syarat & Ketentuan</Link></li>
            </ul>
          </div>

        </div>
      </div>
      
      {/* Bagian Bawah Footer (Copyright) */}
      <div className="bg-black py-4 mt-8">
        <div className="container mx-auto px-6 lg:px-8">
            <p className="text-center text-gray-500 text-sm">
              Copyright © {new Date().getFullYear()} Created by KodeKiri
            </p>
        </div>
      </div>
    </footer>
  );
};


export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="id">
            <body
                className={`${inter.variable} ${playfair.variable} font-sans bg-[#F0F5F9] text-[#1E2022] flex flex-col min-h-screen`}
            >
                <QueryProvider>
                  <ClientOnly>
                    <Toaster position="top-center" richColors />
                    
                    <ConditionalNavbar />

                    <main className="flex-1">
                        {children}
                    </main>

                    <Footer />
                  </ClientOnly>
                </QueryProvider>
            </body>
        </html>
    );
}