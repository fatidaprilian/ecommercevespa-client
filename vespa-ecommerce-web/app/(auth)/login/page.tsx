// file: vespa-ecommerce-web/app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LogIn, Mail, KeyRound, Loader2 } from 'lucide-react';

import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { data } = await api.post('/auth/login', { email, password });
      
      const profileResponse = await api.get('/users/profile', {
        headers: { Authorization: `Bearer ${data.access_token}` }
      });

      setAuth(profileResponse.data, data.access_token);

      router.push('/');
      router.refresh();
      
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Email atau password salah.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
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
            Selamat Datang
            </h2>
            <p className="text-gray-500 mt-2">Masuk untuk melanjutkan ke surga Vespa.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
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
              placeholder="Password Anda"
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

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-md text-base font-bold text-white bg-[#52616B] hover:bg-[#1E2022] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#52616B] transition-all disabled:bg-gray-400"
          >
            {/* --- PERBAIKAN DI SINI --- */}
            {isLoading ? <Loader2 className="animate-spin"/> : <LogIn size={20} />}
            <span>{isLoading ? 'Memproses...' : 'Masuk'}</span>
          </motion.button>
        </form>
        <p className="text-center text-sm text-gray-600">
          Belum punya akun?{' '}
          <Link href="/register" className="font-medium text-[#52616B] hover:underline">
            Daftar sekarang
          </Link>
        </p>
      </motion.div>
    </div>
  );
}