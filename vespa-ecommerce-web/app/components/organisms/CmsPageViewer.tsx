// app/components/organisms/CmsPageViewer.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Loader2, ServerCrash } from 'lucide-react';
import Image from 'next/image';
import api from '@/lib/api';

interface CmsPage {
  slug: string;
  title: string;
  content: string;
  bannerImageUrl?: string;
}

const getPageBySlug = async (slug: string): Promise<CmsPage> => {
  const { data } = await api.get(`/pages/${slug}`);
  return data;
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.5 } },
};

export default function CmsPageViewer({ slug }: { slug: string }) {
  const { data: page, isLoading, isError } = useQuery<CmsPage, Error>({
    queryKey: ['cms-page', slug],
    queryFn: () => getPageBySlug(slug),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-20">
        <ServerCrash className="mx-auto h-12 w-12 text-red-400 mb-4" />
        <p className="text-red-500 text-lg font-semibold">Gagal memuat konten</p>
        <p className="text-gray-500 mt-2">Halaman tidak ditemukan atau terjadi kesalahan server.</p>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      {page.bannerImageUrl && (
        <motion.div 
          className="relative w-full h-60 md:h-80 bg-gray-200"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <Image
            src={page.bannerImageUrl}
            alt={page.title}
            layout="fill"
            objectFit="cover"
            priority
          />
          <div className="absolute inset-0 bg-black/40" />
        </motion.div>
      )}
      <div className="container mx-auto px-4 py-16">
        <motion.div
          className="max-w-4xl mx-auto"
          initial="hidden"
          animate="show"
          variants={containerVariants}
        >
          <motion.h1 
            className="text-4xl md:text-5xl font-extrabold text-center text-gray-800 mb-12"
            variants={itemVariants}
          >
            {page.title}
          </motion.h1>

          <motion.div 
            variants={itemVariants}
            className="prose prose-lg max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        </motion.div>
      </div>
    </div>
  );
}