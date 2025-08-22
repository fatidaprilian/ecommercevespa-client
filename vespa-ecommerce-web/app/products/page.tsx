import { Suspense } from 'react';
import ProductClient from './ProductClient';

// Komponen ini akan ditampilkan sementara,
// saat Next.js menunggu browser siap untuk memuat data produk.
const Loading = () => {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
      <div className="text-center mb-12">
        <div className="w-1/2 h-16 bg-gray-200 rounded-lg animate-pulse mx-auto mb-4"></div>
        <div className="w-1/3 h-8 bg-gray-200 rounded-lg animate-pulse mx-auto"></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="w-full h-96 bg-gray-200 rounded-lg animate-pulse"></div>
        ))}
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ProductClient />
    </Suspense>
  );
}