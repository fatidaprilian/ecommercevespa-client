// src/app/page.tsx

'use client'; // Kita butuh client component untuk menggunakan hook

import { useTestApi } from '@/hooks/use-test-api';

export default function Home() {
  // Gunakan hook yang sudah kita buat
  const { data, isLoading, error } = useTestApi();

  if (isLoading) {
    return <main className="flex min-h-screen flex-col items-center justify-center p-24">Loading...</main>;
  }

  if (error) {
    return <main className="flex min-h-screen flex-col items-center justify-center p-24">Error: {error.message}</main>;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-2xl font-bold">Pesan dari Backend:</h1>
      {/* Tampilkan data yang didapat dari API */}
      <pre className="mt-4 p-4 bg-gray-100 rounded-md">
        <code>{JSON.stringify(data, null, 2)}</code>
      </pre>
    </main>
  );
}