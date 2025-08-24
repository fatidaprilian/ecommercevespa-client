// file: components/guards/AuthGuard.tsx

import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import api from '@/lib/api'; // Gunakan instance axios yang sudah dikonfigurasi
import { User, Role } from '@/services/userService'; // Impor tipe data User dan Role

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const verifyAdmin = async () => {
      try {
        // 1. Panggil endpoint profile untuk mendapatkan data pengguna
        const { data: userProfile } = await api.get<User>('/users/profile');

        // 2. Periksa apakah peran pengguna adalah ADMIN
        if (userProfile && userProfile.role === Role.ADMIN) {
          setIsAuthorized(true); // Hanya jika admin, berikan otorisasi
        } else {
          // Jika bukan admin, paksa redirect ke halaman login
          throw new Error('Access Denied');
        }
      } catch (error) {
        // Jika terjadi error (token tidak valid, bukan admin, dll), redirect
        router.replace('/auth/login');
      } finally {
        setIsVerifying(false);
      }
    };

    verifyAdmin();
  }, [router]); // Kembalikan router ke dependency array

  // Selama proses verifikasi, tampilkan layar loading
  if (isVerifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  // Jika sudah terverifikasi dan diotorisasi sebagai admin, tampilkan konten
  if (isAuthorized) {
    return <>{children}</>;
  }

  // Jika tidak, jangan render apa pun karena sudah di-redirect
  return null;
}