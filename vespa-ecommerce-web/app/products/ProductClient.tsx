// file: app/products/ProductClient.tsx
'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import { ProductCard } from '@/components/molecules/ProductCard';
import { useProducts, ProductQueryParams } from '@/hooks/use-products';
import { useCategories } from '@/hooks/use-categories';
import { useBrands } from '@/hooks/use-brands';
import { Product, Category, Brand } from '@/types';
import { SlidersHorizontal, ServerCrash, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'; // Import RadioGroup
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';

const SkeletonCard = () => (
    <Card className="overflow-hidden shadow-sm flex flex-col h-full bg-white">
        <div className="w-full h-52 bg-gray-200 animate-pulse"></div>
        <CardContent className="p-5 flex flex-col flex-grow">
            <div className="h-4 w-1/3 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-6 w-full bg-gray-300 rounded animate-pulse mb-4"></div>
            <div className="h-8 w-1/2 bg-gray-300 rounded animate-pulse mt-auto"></div>
        </CardContent>
    </Card>
);

const PaginationControls = ({ currentPage, totalPages, onPageChange, isPlaceholderData }: any) => {
    if (totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-center gap-4 mt-12">
            <Button variant="outline" size="icon" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1 || isPlaceholderData}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-medium text-gray-700">Halaman {currentPage} dari {totalPages}</span>
            <Button variant="outline" size="icon" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages || isPlaceholderData}><ChevronRight className="h-4 w-4" /></Button>
        </div>
    );
};

// ====================================================================
// KOMPONEN FILTER POPUP YANG DIROMBAK
// ====================================================================
function FilterPopup({ onApplyFilters, currentFilters }: {
  onApplyFilters: (filters: { categoryId?: string, brandId?: string[] }) => void;
  currentFilters: { categoryId?: string, brandId?: string[] };
}) {
  const [isOpen, setIsOpen] = useState(false);
  
  const [tempCategoryId, setTempCategoryId] = useState(currentFilters.categoryId);
  const [tempBrandIds, setTempBrandIds] = useState(new Set(currentFilters.brandId));
  const [searchTerm, setSearchTerm] = useState({ category: '', brand: '' });

  const { data: allCategories } = useCategories();
  const { data: allBrands } = useBrands();

  const filteredCategories = useMemo(() =>
    allCategories?.filter(c => c.name.toLowerCase().includes(searchTerm.category.toLowerCase())) || [],
  [allCategories, searchTerm.category]);

  const filteredBrands = useMemo(() =>
    allBrands?.filter(b => b.name.toLowerCase().includes(searchTerm.brand.toLowerCase())) || [],
  [allBrands, searchTerm.brand]);

  const handleBrandSelect = (brandId: string) => {
    setTempBrandIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(brandId)) {
        newSet.delete(brandId);
      } else {
        newSet.add(brandId);
      }
      return newSet;
    });
  };

  const handleApply = () => {
    onApplyFilters({ categoryId: tempCategoryId, brandId: Array.from(tempBrandIds) });
    setIsOpen(false);
  };

  const handleReset = () => {
    setTempCategoryId(undefined);
    setTempBrandIds(new Set());
    onApplyFilters({ categoryId: undefined, brandId: [] });
    setIsOpen(false);
  };
  
  useEffect(() => {
    if (isOpen) {
      setTempCategoryId(currentFilters.categoryId);
      setTempBrandIds(new Set(currentFilters.brandId));
    }
  }, [isOpen, currentFilters]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 relative">
          <SlidersHorizontal className="h-4 w-4" /> Filter
          {(currentFilters.brandId.length > 0 || currentFilters.categoryId) && (
            <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
              {currentFilters.brandId.length + (currentFilters.categoryId ? 1 : 0)}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] grid-rows-[auto_1fr_auto] p-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-xl">Filter Produk</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-x-6 px-6 py-4 overflow-hidden">
            {/* Kolom Kategori */}
            <div className="flex flex-col gap-3 overflow-hidden">
                <Label className="font-semibold">Kategori</Label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                    <Input placeholder="Cari kategori..." className="pl-9" value={searchTerm.category} onChange={e => setSearchTerm(p => ({...p, category: e.target.value}))}/>
                </div>
                {/* Menggunakan RadioGroup untuk Kategori */}
                <RadioGroup value={tempCategoryId} onValueChange={setTempCategoryId} className="flex-1 space-y-1 pr-3 -mr-4 overflow-y-auto">
                    {filteredCategories.map((cat: Category) => (
                      <div key={cat.id} className="flex items-center space-x-3 p-2 rounded-md has-[[data-state=checked]]:bg-accent hover:bg-accent">
                          <RadioGroupItem value={cat.id} id={`cat-${cat.id}`} />
                          <Label htmlFor={`cat-${cat.id}`} className="font-normal cursor-pointer w-full">
                              {cat.name}
                          </Label>
                      </div>
                    ))}
                </RadioGroup>
            </div>
            {/* Kolom Merek */}
            <div className="flex flex-col gap-3 overflow-hidden border-l pl-6">
                <Label className="font-semibold">Merek</Label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                    <Input placeholder="Cari merek..." className="pl-9" value={searchTerm.brand} onChange={e => setSearchTerm(p => ({...p, brand: e.target.value}))}/>
                </div>
                <div className="flex-1 space-y-1 pr-3 -mr-4 overflow-y-auto">
                    {filteredBrands.map((brand: Brand) => (
                      <div key={brand.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-accent">
                        <Checkbox 
                          id={`brand-${brand.id}`} 
                          checked={tempBrandIds.has(brand.id)}
                          onCheckedChange={() => handleBrandSelect(brand.id)}
                        />
                        <Label htmlFor={`brand-${brand.id}`} className="font-normal cursor-pointer">
                          {brand.name}
                        </Label>
                      </div>
                    ))}
                </div>
            </div>
        </div>
        <DialogFooter className="p-6 pt-4 mt-auto border-t">
          <Button variant="ghost" onClick={handleReset}>Reset Filter</Button>
          <Button onClick={handleApply}>Terapkan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export default function ProductClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  const buildQueryParams = (params: URLSearchParams): ProductQueryParams => ({
    page: Number(params.get('page')) || 1,
    limit: 12,
    sortBy: (params.get('sortBy') as 'price' | 'createdAt') || 'createdAt',
    sortOrder: (params.get('sortOrder') as 'asc' | 'desc') || 'desc',
    search: params.get('search') || undefined,
    categoryId: params.get('categoryId') || undefined,
    brandId: params.getAll('brandId') || [],
  });

  const [queryParams, setQueryParams] = useState<ProductQueryParams>(() => buildQueryParams(searchParams));

  useEffect(() => {
    setQueryParams(buildQueryParams(searchParams));
  }, [searchParams]);

  useEffect(() => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
  }, [isAuthenticated, queryClient]);

  const { data: productsResponse, isLoading, isError, isPlaceholderData } = useProducts(queryParams);
  const products = productsResponse?.data;
  const meta = productsResponse?.meta;

  const updateUrlParams = (newParams: Partial<ProductQueryParams>) => {
    const currentParams = new URLSearchParams(searchParams.toString());
    
    currentParams.delete('brandId');

    Object.entries(newParams).forEach(([key, value]) => {
      if (key === 'brandId' && Array.isArray(value)) {
          value.forEach(id => currentParams.append(key, id));
      } else if (value) {
        currentParams.set(key, String(value));
      } else {
        currentParams.delete(key);
      }
    });
    router.push(`/products?${currentParams.toString()}`);
  };

  const handleApplyFilters = (filters: { categoryId?: string, brandId?: string[] }) => {
    updateUrlParams({ page: 1, ...filters });
  };

  const handleClearFilters = () => {
    updateUrlParams({ categoryId: undefined, brandId: [], search: undefined });
  };

  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split('-');
    updateUrlParams({ page: 1, sortBy, sortOrder });
  };

  const handlePageChange = (page: number) => {
    updateUrlParams({ page });
  };

  const activeFiltersCount = [queryParams.categoryId, ...(queryParams.brandId || []), queryParams.search].filter(Boolean).length;

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">

        <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: "easeOut" }} className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-[#1E2022] mb-4 font-playfair">Katalog Produk</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">Temukan semua suku cadang original dan performa tinggi untuk menyempurnakan Vespa Anda.</p>
        </motion.div>

        {activeFiltersCount > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center items-center gap-4 bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl shadow-sm mb-8">
            <span className="font-medium">Menampilkan hasil untuk filter yang aktif.</span>
            <Button variant="ghost" size="sm" onClick={handleClearFilters} className="gap-1.5 text-blue-700 hover:bg-blue-100">
              <X className="h-4 w-4"/> Hapus Semua Filter
            </Button>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }} className="flex items-center justify-between gap-4 bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-md mb-10 sticky top-24 z-10 border">
          <FilterPopup
            onApplyFilters={handleApplyFilters}
            currentFilters={{ categoryId: queryParams.categoryId, brandId: queryParams.brandId || [] }}
          />
          <Select onValueChange={handleSortChange} value={`${queryParams.sortBy}-${queryParams.sortOrder}`}>
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Urutkan" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt-desc">Terbaru</SelectItem>
              <SelectItem value="price-asc">Harga Terendah</SelectItem>
              <SelectItem value="price-desc">Harga Tertinggi</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        <div>
          <AnimatePresence mode="wait">
            <motion.div
              key={JSON.stringify(queryParams)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {isLoading ? (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">
                  {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : isError ? (
                <div className="text-center py-20 bg-white rounded-lg shadow-md">
                  <ServerCrash className="mx-auto h-12 w-12 text-red-400 mb-4" />
                  <p className="text-red-500 text-lg font-semibold">Oops! Terjadi Kesalahan</p>
                  <p className="text-gray-500 mt-2">Gagal memuat data produk. Silakan coba lagi nanti.</p>
                </div>
              ) : products && products.length > 0 ? (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">
                  {products.map((product: Product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-white rounded-lg shadow-md">
                  <p className="text-gray-500 text-lg font-semibold">Produk Tidak Ditemukan</p>
                  <p className="text-gray-400 mt-2">Coba sesuaikan filter atau kata kunci pencarian Anda.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <PaginationControls
          currentPage={meta?.page || 1}
          totalPages={meta?.lastPage || 1}
          onPageChange={handlePageChange}
          isPlaceholderData={isPlaceholderData}
        />
      </div>
    </div>
  );
}