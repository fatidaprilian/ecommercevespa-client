// pages/settings/banners/[id].tsx

'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { getBannerById } from '@/services/bannerService';
import { BannerForm } from './_form';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function EditBannerPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: banner, isLoading, error } = useQuery({
    queryKey: ['banner', id],
    queryFn: () => getBannerById(id),
    enabled: !!id,
  });

  return (
    <div className="space-y-6">
      <Link href="/settings/banners">
        <Button variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali ke Daftar Banner
        </Button>
      </Link>
      
      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="animate-spin" />
          <p className="ml-2">Memuat data banner...</p>
        </div>
      )}

      {error && <p className="text-red-500">Gagal memuat data banner.</p>}

      {banner && <BannerForm initialData={banner} />}
    </div>
  );
}