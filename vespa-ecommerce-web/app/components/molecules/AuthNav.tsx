'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { User, LogOut, UserPlus } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';

export default function AuthNav() {
  const { user, isAuthenticated, setAuth } = useAuthStore();

  useEffect(() => {
    // Fungsi ini tetap di sini untuk mengambil data user jika token ada
    // tapi data user belum ada (misal: setelah refresh)
    const fetchProfileOnLoad = async () => {
      try {
        const { data } = await api.get('/users/profile');
        const token = useAuthStore.getState().token;
        setAuth(data, token);
      } catch (error) {
        console.error("Sesi tidak valid, logout.", error);
        setAuth(null, null);
      }
    };

    if (isAuthenticated && !user) {
      fetchProfileOnLoad();
    }
  }, [isAuthenticated, user, setAuth]);

  const handleLogout = () => {
    setAuth(null, null);
  };

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center space-x-4">
        <span className="hidden sm:inline font-semibold">Halo, {user.name}!</span>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full text-sm font-semibold transition-all transform hover:scale-105"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <Link href="/login" className="flex items-center gap-2 hover:bg-gray-500/10 px-4 py-2 rounded-full text-sm font-semibold transition-all">
        <User className="w-4 h-4" />
        Login
      </Link>
      <Link href="/register" className="hidden sm:flex items-center gap-2 bg-[#52616B] text-white hover:bg-[#1E2022] px-4 py-2 rounded-full text-sm font-semibold transition-all transform hover:scale-105">
        <UserPlus className="w-4 h-4" />
        Register
      </Link>
    </div>
  );
}