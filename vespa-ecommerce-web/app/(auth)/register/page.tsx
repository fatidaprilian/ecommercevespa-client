// vespa-ecommerce-web/src/app/(auth)/register/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password minimal harus 6 karakter.');
      return;
    }

    try {
      await api.post('/auth/register', { name, email, password });
      alert('Pendaftaran berhasil! Silakan login.');
      router.push('/login');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Terjadi kesalahan saat mendaftar.');
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-200px)] bg-[#FAF9EE]">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md border border-[#EEEEEE]">
        <h2 className="text-3xl font-bold text-center text-gray-800">Daftar Akun Baru</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#A2AF9B] focus:border-[#A2AF9B]"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alamat Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#A2AF9B] focus:border-[#A2AF9B]"
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#A2AF9B] focus:border-[#A2AF9B]"
              placeholder="Minimal 6 karakter"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-[#A2AF9B] hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A2AF9B] transition-colors"
          >
            Daftar
          </button>
        </form>
        <p className="text-center text-sm text-gray-600">
          Sudah punya akun?{' '}
          <Link href="/login" className="font-medium text-[#A2AF9B] hover:underline">
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  );
}