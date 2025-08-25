import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getCategories, PaginatedCategories } from '@/services/categoryService';

const pageVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { ease: 'easeOut', duration: 0.4 } },
  exit: { opacity: 0, transition: { ease: 'easeIn', duration: 0.2 } },
};

export default function CategoriesPage() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

  const { data: categoriesResponse, isLoading, isError, error } = useQuery<PaginatedCategories, Error>({
    queryKey: ['categories', page, debouncedSearchTerm],
    queryFn: () => getCategories({ page, search: debouncedSearchTerm }),
    keepPreviousData: true,
  });

  const categories = categoriesResponse?.data;
  const meta = categoriesResponse?.meta;

  return (
    <motion.div initial="hidden" animate="visible" variants={pageVariants}>
      <motion.div variants={itemVariants} className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manajemen Kategori</h1>
          <p className="text-muted-foreground">Kelola semua kategori produk di toko Anda.</p>
        </div>
        <Button asChild>
          <Link href="/categories/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Tambah Kategori
          </Link>
        </Button>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Daftar Kategori</CardTitle>
            <div className="flex justify-between items-center pt-2">
              <CardDescription>
                Total {meta?.total || 0} kategori ditemukan. Halaman {meta?.page || 1} dari {meta?.lastPage || 1}.
              </CardDescription>
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama kategori..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Gambar</TableHead>
                  <TableHead>Nama Kategori</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <AnimatePresence mode="wait">
                <motion.tbody
                  key={`${page}-${debouncedSearchTerm}`}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
                >
                  {isLoading ? (
                    <motion.tr variants={itemVariants}>
                      <TableCell colSpan={3} className="text-center h-24">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                      </TableCell>
                    </motion.tr>
                  ) : isError ? (
                    <motion.tr variants={itemVariants}>
                      <TableCell colSpan={3} className="text-center h-24 text-red-500">{(error as Error).message}</TableCell>
                    </motion.tr>
                  ) : categories?.length > 0 ? (
                    categories.map((category) => (
                      <motion.tr key={category.id} variants={itemVariants}>
                        <TableCell>
                           <Image src={category.imageUrl || '/placeholder.svg'} alt={category.name} width={48} height={48} className="rounded-md object-cover bg-muted" />
                        </TableCell>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Buka menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/categories/edit?id=${category.id}`}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  <span>Edit</span>
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600 focus:text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Hapus</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    ))
                  ) : (
                    <motion.tr variants={itemVariants}>
                      <TableCell colSpan={3} className="text-center h-24">Kategori tidak ditemukan.</TableCell>
                    </motion.tr>
                  )}
                </motion.tbody>
              </AnimatePresence>
            </Table>

            {meta && meta.lastPage > 1 && (
              <div className="flex items-center justify-end space-x-2 pt-4">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1 || isLoading}>
                  <ChevronLeft className="h-4 w-4" />
                  <span>Sebelumnya</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === meta.lastPage || isLoading}>
                  <span>Berikutnya</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}