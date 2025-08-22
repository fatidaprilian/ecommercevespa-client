// file: vespa-ecommerce-web/app/(auth)/register/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { UserPlus, User, Mail, KeyRound, Loader2, CheckCircle2 } from 'lucide-react';

import api from '@/lib/api';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null); // State baru untuk pesan sukses
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null); // Hapus pesan sukses sebelumnya

    if (password.length < 8) {
      setError('Password minimal harus 8 karakter.');
      return;
    }
    setIsLoading(true);

    try {
      await api.post('/auth/register', { name, email, password });
      
      // Ganti alert() dengan state message
      setSuccessMessage('Pendaftaran berhasil! Anda akan dialihkan...');
      
      // Alihkan ke halaman login setelah 2 detik
      setTimeout(() => {
        router.push('/login');
      }, 2000);

    } catch (err: any) {
      const errorMessage = Array.isArray(err.response?.data?.message)
        ? err.response.data.message.join(', ')
        : err.response?.data?.message;
      setError(errorMessage || 'Terjadi kesalahan saat mendaftar.');
      setIsLoading(false); // Hentikan loading hanya jika terjadi error
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#F0F5F9] px-4 pt-20">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md p-8 md:p-10 space-y-6 bg-white rounded-2xl shadow-2xl border"
      >
        <div className="text-center">
            <h2 className="text-4xl font-bold text-gray-800 font-playfair">
                Buat Akun Baru
            </h2>
            <p className="text-gray-500 mt-2">Bergabung dengan ribuan pecinta Vespa lainnya.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"/>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#52616B] transition-all"
                placeholder="Nama Lengkap"
              />
          </div>
          <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"/>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#52616B] transition-all"
                placeholder="email@example.com"
              />
          </div>
          <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"/>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#52616B] transition-all"
                placeholder="Minimal 8 karakter"
              />
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-600 text-sm text-center bg-red-100 p-3 rounded-md"
            >
              {error}
            </motion.p>
          )}

          {/* --- BLOK PESAN SUKSES --- */}
          {successMessage && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2 text-green-700 text-sm text-center bg-green-100 p-3 rounded-md"
            >
              <CheckCircle2 size={18} />
              <span>{successMessage}</span>
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-md text-base font-bold text-white bg-[#52616B] hover:bg-[#1E2022] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#52616B] transition-all disabled:bg-gray-400"
          >
            {isLoading ? <Loader2 className="animate-spin"/> : <UserPlus size={20} />}
            <span>{isLoading ? 'Memproses...' : 'Daftar'}</span>
          </motion.button>
        </form>
        <p className="text-center text-sm text-gray-600">
          Sudah punya akun?{' '}
          <Link href="/login" className="font-medium text-[#52616B] hover:underline">
            Masuk di sini
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
