// pages/settings/banners/index.tsx

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';

import { getBanners, deleteBanner, Banner } from '@/services/bannerService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function BannersPage() {
  const queryClient = useQueryClient();

  const { data: banners, isLoading } = useQuery({ queryKey: ['banners'], queryFn: getBanners });

  const deleteMutation = useMutation({
    mutationFn: deleteBanner,
    onSuccess: () => {
      toast.success('Banner berhasil dihapus.');
      queryClient.invalidateQueries({ queryKey: ['banners'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal menghapus.'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengaturan Banner Homepage</h1>
          <p className="text-muted-foreground">Kelola gambar untuk Hero Carousel dan Banner Tengah.</p>
        </div>
        <Link href="/settings/banners/new">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Tambah Banner
          </Button>
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Daftar Banner</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Gambar</TableHead>
                  <TableHead>Judul</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {banners?.map((banner) => (
                  <TableRow key={banner.id}>
                    <TableCell>
                      <img src={banner.imageUrl} alt={banner.title || 'Banner Image'} className="w-24 h-12 object-cover rounded-md" />
                    </TableCell>
                    <TableCell className="font-medium">{banner.title || '-'}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${banner.type === 'HERO' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                        {banner.type}
                      </span>
                    </TableCell>
                    <TableCell>{banner.isActive ? 'Aktif' : 'Nonaktif'}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/settings/banners/${banner.id}`}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => window.confirm('Yakin ingin menghapus banner ini?') && deleteMutation.mutate(banner.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Hapus
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}