// pages/components/guards/AuthGuard.tsx

import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        await axios.get(`${apiUrl}/users/profile`, {
          withCredentials: true,
        });
        setIsAuthenticated(true);
      } catch (error) {
        router.replace('/auth/login');
      } finally {
        setIsVerifying(false);
      }
    };

    verifyUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // <-- PERUBAHAN UTAMA: Hapus 'router' dari dependency array

  // Selama proses verifikasi, tampilkan layar loading
  if (isVerifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  // Jika sudah terverifikasi dan otentik, tampilkan konten halaman
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Jika tidak otentik, jangan tampilkan apa-apa (karena sudah di-redirect)
  return null;
}