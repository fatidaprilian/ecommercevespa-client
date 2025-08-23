// file: app/categories/CategoriesClient.tsx (File BARU)

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Package, Sparkles, Tag, Wrench, Zap } from 'lucide-react';

import { useCategories } from '@/hooks/use-categories';
import { Category } from '@/types';
import { Button } from '@/components/ui/button';

const categoryIcons: { [key: string]: React.ElementType } = {
  'Engine Parts': Wrench, 'Body & Frame': Package, 'Electrical': Zap, 'Accessories': Sparkles, 'default': Tag
};

export default function CategoriesClient() {
  const [page, setPage] = useState(1);
  const { data: categoriesResponse, isLoading } = useCategories({ page, limit: 12 });

  const categories = categoriesResponse?.data;
  const meta = categoriesResponse?.meta;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 },
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-5xl font-bold text-[#1E2022] mb-4 font-playfair">Semua Kategori</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Temukan setiap bagian dari Vespa Anda, terorganisir untuk kemudahan Anda.
        </p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
      >
        {categories?.map((cat: Category) => {
          const Icon = categoryIcons[cat.name] || categoryIcons.default;
          const imageSrc = cat.imageUrl || `https://source.unsplash.com/400x500/?${cat.name.split(' ')[0].toLowerCase()}`;

          return (
            <motion.div key={cat.id} variants={itemVariants}>
              <Link href={`/products?categoryId=${cat.id}`} className="group block h-full">
                <div className="relative h-80 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1">
                  <img src={imageSrc} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 p-5">
                    <div className="bg-[#C9D6DF] text-[#1E2022] p-3 rounded-full w-fit mb-3 transition-transform group-hover:scale-105"><Icon className="w-6 h-6" /></div>
                    <h3 className="text-xl font-bold text-white transition-colors font-playfair">{cat.name}</h3>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
      
      {meta && meta.lastPage > 1 && (
        <div className="flex items-center justify-center space-x-2 pt-12">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1 || isLoading}>
                <ChevronLeft className="h-4 w-4" />
                <span>Sebelumnya</span>
            </Button>
            <span className="text-sm text-muted-foreground">Halaman {meta.page} dari {meta.lastPage}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === meta.lastPage || isLoading}>
                <span>Berikutnya</span>
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
      )}
    </div>
  );
}