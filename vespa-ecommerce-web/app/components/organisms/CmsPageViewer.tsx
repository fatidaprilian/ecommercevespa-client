// app/components/organisms/CmsPageViewer.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Loader2, ServerCrash } from 'lucide-react';
import Image from 'next/image';
import api from '@/lib/api';
import DOMPurify from 'isomorphic-dompurify';
import parse from 'html-react-parser';

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

  if (!page) {
    return null;
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
      <div className="container mx-auto px-4 py-8 md:py-14">
        <motion.div
          className="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-100 p-6 sm:p-10 md:p-14 shadow-sm"
          initial="hidden"
          animate="show"
          variants={containerVariants}
        >
          <motion.h1 
            className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 mb-8 pb-4 border-b border-gray-100"
            variants={itemVariants}
          >
            {page.title}
          </motion.h1>

          <motion.div 
            variants={itemVariants}
            className="text-gray-700 text-sm sm:text-base leading-relaxed space-y-4 [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:text-gray-900 [&>h1]:mt-6 [&>h1]:mb-3 [&>h2]:text-xl [&>h2]:font-bold [&>h2]:text-gray-900 [&>h2]:mt-6 [&>h2]:mb-3 [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:text-gray-900 [&>h3]:mt-4 [&>h3]:mb-2 [&>p]:mb-4 [&>p]:leading-relaxed [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-4 [&>ul]:space-y-1 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-4 [&>ol]:space-y-1 [&>blockquote]:border-l-4 [&>blockquote]:border-gray-300 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:my-4"
          >
            {parse(DOMPurify.sanitize(page.content))}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}