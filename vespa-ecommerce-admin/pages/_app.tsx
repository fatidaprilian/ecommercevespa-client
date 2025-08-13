import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast'; // <-- 1. Impor Toaster

import AdminLayout from '@/components/layouts/AdminLayout';
import AuthGuard from '@/components/guards/AuthGuard';
import './globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {/* 2. Letakkan Toaster di sini agar tersedia di semua halaman */}
      <Toaster position="top-center" reverseOrder={false} />

      {/* 3. Logika untuk halaman login tetap dipertahankan */}
      {router.pathname === '/auth/login' ? (
        <Component {...pageProps} />
      ) : (
        <AuthGuard>
          <AdminLayout>
            <Component {...pageProps} />
          </AdminLayout>
        </AuthGuard>
      )}
    </QueryClientProvider>
  );
}

export default MyApp;