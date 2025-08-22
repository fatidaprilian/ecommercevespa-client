'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar'; // Ini adalah komponen Navbar Anda yang sudah ada

export default function ConditionalNavbar() {
  const pathname = usePathname();

  // Daftar halaman di mana navbar akan disembunyikan
  const hiddenPaths = ['/cart', '/checkout', '/login', '/register'];

  // Jika halaman saat ini ada di dalam daftar, jangan tampilkan apa-apa
  if (hiddenPaths.includes(pathname)) {
    return null;
  }

  // Jika tidak, tampilkan Navbar seperti biasa
  return <Navbar />;
}