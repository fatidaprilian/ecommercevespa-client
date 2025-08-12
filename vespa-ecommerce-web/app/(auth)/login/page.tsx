'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false); // State untuk loading
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true); // Mulai loading

    try {
      // 1. Kirim request login dan dapatkan token
      const { data } = await api.post('/auth/login', { email, password });
      
      // 2. Simpan token ke store. User akan di-set null sementara.
      // Komponen AuthNav atau komponen lain yang membutuhkan data user
      // akan mengambilnya secara otomatis setelah ini.
      setAuth(null, data.access_token);

      // 3. Arahkan ke halaman utama setelah berhasil
      router.push('/');
      
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Email atau password yang Anda masukkan salah.';
      setError(errorMessage);
    } finally {
      setIsLoading(false); // Selesai loading
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-200px)] bg-[#FAF9EE]">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-lg border border-gray-200/50">
        <h2 className="text-3xl font-bold text-center text-gray-800" style={{ fontFamily: "'Playfair Display', serif" }}>
          Selamat Datang Kembali
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alamat Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A2AF9B] focus:border-transparent transition-all disabled:bg-gray-100"
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#A2AF9B] focus:border-transparent transition-all disabled:bg-gray-100"
              placeholder="Password Anda"
            />
          </div>

          {error && <p className="text-red-600 text-sm text-center bg-red-100 p-3 rounded-md">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-base font-bold text-white bg-[#A2AF9B] hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A2AF9B] transition-all transform hover:scale-105 disabled:bg-gray-400 disabled:scale-100"
          >
            {isLoading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-600">
          Belum punya akun?{' '}
          <Link href="/register" className="font-medium text-[#A2AF9B] hover:underline">
            Daftar sekarang
          </Link>
        </p>
      </div>
    </div>
  );
}