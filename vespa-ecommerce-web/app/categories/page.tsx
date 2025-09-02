import { Suspense } from 'react';
import CategoriesClient from './CategoriesClient';
import { Skeleton } from '@/components/ui/skeleton';

const Loading = () => {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <Skeleton className="h-12 w-1/2 mx-auto mb-4" />
        <Skeleton className="h-6 w-1/3 mx-auto" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="w-full h-80 rounded-lg" />
        ))}
      </div>
    </div>
  );
};

export default function CategoriesPage() {
  return (
    <div className="bg-white min-h-screen pt-28">
      <Suspense fallback={<Loading />}>
        <CategoriesClient />
      </Suspense>
    </div>
  );
}