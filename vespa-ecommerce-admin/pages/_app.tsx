// pages/_app.tsx

import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { useState } from 'react'; // Impor useState
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // Impor React Query
import AdminLayout from '@/components/layouts/AdminLayout';
import AuthGuard from '@/components/guards/AuthGuard';
import './globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  // Buat instance QueryClient. useState memastikan ini hanya dibuat sekali.
  const [queryClient] = useState(() => new QueryClient());

  if (router.pathname === '/auth/login') {
    return <Component {...pageProps} />;
  }

  return (
    // Bungkus semua dengan QueryClientProvider
    <QueryClientProvider client={queryClient}>
      <AuthGuard>
        <AdminLayout>
          <Component {...pageProps} />
        </AdminLayout>
      </AuthGuard>
    </QueryClientProvider>
  );
}

export default MyApp;