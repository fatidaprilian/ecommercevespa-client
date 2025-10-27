import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner'; 

import AdminLayout from '@/components/layouts/AdminLayout';
import AuthGuard from '@/components/guards/AuthGuard';
import './globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster /> {/* <-- 2. DIUBAH: Gunakan Toaster Sonner */}

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
