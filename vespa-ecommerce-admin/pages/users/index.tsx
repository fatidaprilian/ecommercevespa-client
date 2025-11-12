// pages/users/index.tsx

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { MoreHorizontal, Edit, Trash2, Search, Percent, Loader2, ChevronLeft, ChevronRight, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getActiveUsers, getInactiveUsers, deleteUser, toggleUserActiveStatus, User as UserType } from '@/services/userService';
// 👇 IMPORT BARU
import { getPriceCategories } from '@/services/accurateService';

interface User extends UserType {
    isActive: boolean;
    createdAt: string;
    accurateCustomerNo?: string;
    accuratePriceCategoryId?: number | null;
}

// Komponen helper tetap sama
const pageVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { ease: 'easeOut', duration: 0.4 } },
  exit: { opacity: 0, transition: { ease: 'easeIn', duration: 0.2 } },
};
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
const RoleBadge = ({ role }: { role: string }) => {
    const roleStyles: { [key: string]: string } = { ADMIN: 'bg-red-100 text-red-800', RESELLER: 'bg-blue-100 text-blue-800', MEMBER: 'bg-gray-100 text-gray-800' };
    return (<span className={`px-2 py-1 text-xs font-semibold rounded-full ${roleStyles[role] || roleStyles.MEMBER}`}>{role}</span>);
};

// 👇👇 KOMPONEN BADGE KATEGORI (DIREVISI AGAR DINAMIS) 👇👇
const CategoryBadge = ({ id, name }: { id?: number | null; name?: string }) => {
  if (!id) {
    return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-500 italic">Auto</span>;
  }
  
  // Logika warna berdasarkan nama kategori
  const getCategoryColor = (categoryName?: string) => {
    const lowerName = categoryName?.toLowerCase() || '';
    if (lowerName.includes('umum')) return 'bg-yellow-100 text-yellow-800';
    if (lowerName.includes('member-10')) return 'bg-indigo-100 text-indigo-800'; // Cek 10 dulu sebelum 1 agar tidak salah match
    if (lowerName.includes('member-1')) return 'bg-purple-100 text-purple-800';
    if (lowerName.includes('member-2')) return 'bg-blue-100 text-blue-800';
    if (lowerName.includes('member-3')) return 'bg-cyan-100 text-cyan-800';
    if (lowerName.includes('member-4')) return 'bg-teal-100 text-teal-800';
    if (lowerName.includes('member-5')) return 'bg-green-100 text-green-800';
    // ... bisa tambahkan warna lain sesuai kebutuhan ...
    return 'bg-gray-100 text-gray-800'; // Default color
  };

  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getCategoryColor(name)}`}>
      {name || `ID: ${id}`}
    </span>
  );
};
// 👆👆 AKHIR REVISI KOMPONEN 👆👆

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const ITEMS_PER_PAGE = 10;

  // 👇👇 1. FETCH KATEGORI HARGA DARI ACCURATE 👇👇
  const { data: priceCategories } = useQuery({
      queryKey: ['accuratePriceCategories'],
      queryFn: getPriceCategories,
      staleTime: 1000 * 60 * 60, // Cache 1 jam agar hemat request
  });

  // 👇👇 2. BUAT MAPPING (ID -> NAME) 👇👇
  const categoryMapping = useMemo(() => {
      if (!priceCategories) return {};
      // Mengubah array [{id: 50, name: 'Umum'}, ...] menjadi object { 50: 'Umum', ... }
      return priceCategories.reduce((acc, cat) => {
          acc[cat.id] = cat.name;
          return acc;
      }, {} as Record<number, string>);
  }, [priceCategories]);
  // 👆👆 ------------------------------------ 👆👆

  const queryFn = activeTab === 'active' ? getActiveUsers : getInactiveUsers;
  const { data: usersData, isLoading, isError, error } = useQuery<User[], Error>({
      queryKey: ['users', activeTab],
      queryFn: queryFn,
  });
  const users = usersData;

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchTerm) return users;
    const lowercasedTerm = searchTerm.toLowerCase();
    return users.filter(user =>
      (user.name?.toLowerCase() || '').includes(lowercasedTerm) ||
      user.email.toLowerCase().includes(lowercasedTerm)
    );
  }, [users, searchTerm]);

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = useMemo(() => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredUsers, page]);

  const softDeleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: (data, userId) => {
        toast.success(data.message || 'Pengguna berhasil dinonaktifkan.');
        queryClient.invalidateQueries({ queryKey: ['users', 'active'] });
        queryClient.invalidateQueries({ queryKey: ['users', 'inactive'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menonaktifkan pengguna.');
    },
  });

  const handleDelete = (id: string) => {
    if (window.confirm('Anda yakin ingin menonaktifkan pengguna ini? Mereka tidak akan bisa login lagi.')) {
      softDeleteMutation.mutate(id);
    }
  };

  const toggleActiveMutation = useMutation({
    mutationFn: toggleUserActiveStatus,
    onSuccess: (data, userId) => {
        toast.success(data.message || `Status pengguna diubah.`);
        queryClient.invalidateQueries({ queryKey: ['users', 'active'] });
        queryClient.invalidateQueries({ queryKey: ['users', 'inactive'] });
    },
    onError: (err: any, userId) => {
      toast.error(err.response?.data?.message || 'Gagal mengubah status pengguna.');
      queryClient.invalidateQueries({ queryKey: ['users', activeTab] });
    },
  });

  const handleToggleActive = (userId: string, currentStatus: boolean) => {
      toggleActiveMutation.mutate(userId);
  };

  const syncCategoryMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await api.patch(`/users/${userId}/sync-category`);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        queryClient.invalidateQueries({ queryKey: ['users', activeTab] });
      } else {
        toast.warning(data.message);
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal sinkronkan kategori dari Accurate');
    },
  });

  const handleSyncCategory = (userId: string) => {
    syncCategoryMutation.mutate(userId);
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={pageVariants} className="space-y-6">
      <motion.div variants={itemVariants} className="flex items-center justify-between">
         <div>
            <h1 className="text-2xl font-bold tracking-tight">Manajemen Pengguna</h1>
            <p className="text-muted-foreground">Kelola pengguna dan peran akses mereka.</p>
         </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value as 'active' | 'inactive'); setPage(1); setSearchTerm(''); }}>
          <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
            <TabsList>
              <TabsTrigger value="active">Pengguna Aktif</TabsTrigger>
              <TabsTrigger value="inactive">Pengguna Nonaktif</TabsTrigger>
            </TabsList>
            <div className="relative w-full sm:w-auto sm:max-w-sm">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                 <Input placeholder="Cari berdasarkan nama atau email..." className="pl-9" value={searchTerm} onChange={(e) => {setSearchTerm(e.target.value); setPage(1);}} />
            </div>
          </div>

          <TabsContent value="active">
             <Card>
                <CardHeader>
                  <CardTitle>Daftar Pengguna Aktif</CardTitle>
                  <CardDescription>
                      Total {filteredUsers.length} pengguna aktif ditemukan. Halaman {page} dari {totalPages || 1}.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                    <UserTable
                        users={paginatedUsers}
                        categoryMapping={categoryMapping} // 👈 OPER MAPPING KE SINI
                        isLoading={isLoading}
                        isError={isError}
                        error={error}
                        page={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                        handleToggleActive={handleToggleActive}
                        handleDelete={handleDelete}
                        handleSyncCategory={handleSyncCategory}
                        toggleActiveMutationLoading={toggleActiveMutation.isPending}
                        toggleActiveMutationVariables={toggleActiveMutation.variables}
                        softDeleteMutationLoading={softDeleteMutation.isPending}
                        softDeleteMutationVariables={softDeleteMutation.variables}
                        syncCategoryMutationLoading={syncCategoryMutation.isPending}
                        syncCategoryMutationVariables={syncCategoryMutation.variables}
                        isInactiveView={false}
                    />
                </CardContent>
              </Card>
          </TabsContent>

          <TabsContent value="inactive">
             <Card>
                <CardHeader>
                  <CardTitle>Daftar Pengguna Nonaktif</CardTitle>
                   <CardDescription>
                      Total {filteredUsers.length} pengguna nonaktif ditemukan. Halaman {page} dari {totalPages || 1}.
                  </CardDescription>
                </CardHeader>
                 <CardContent>
                     <UserTable
                        users={paginatedUsers}
                        categoryMapping={categoryMapping} // 👈 OPER MAPPING KE SINI JUGA
                        isLoading={isLoading}
                        isError={isError}
                        error={error}
                        page={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                        handleToggleActive={handleToggleActive}
                        handleDelete={handleDelete}
                        handleSyncCategory={handleSyncCategory}
                        toggleActiveMutationLoading={toggleActiveMutation.isPending}
                        toggleActiveMutationVariables={toggleActiveMutation.variables}
                        softDeleteMutationLoading={softDeleteMutation.isPending}
                        softDeleteMutationVariables={softDeleteMutation.variables}
                        syncCategoryMutationLoading={syncCategoryMutation.isPending}
                        syncCategoryMutationVariables={syncCategoryMutation.variables}
                        isInactiveView={true}
                    />
                 </CardContent>
              </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}

// 👇👇 KOMPONEN TABEL DIUPDATE 👇👇
interface UserTableProps {
    users: User[];
    categoryMapping: Record<number, string>; // 👈 TERIMA PROPS INI
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    page: number;
    totalPages: number;
    onPageChange: (newPage: number) => void;
    handleToggleActive: (userId: string, currentStatus: boolean) => void;
    handleDelete: (userId: string) => void;
    handleSyncCategory: (userId: string) => void;
    toggleActiveMutationLoading: boolean;
    toggleActiveMutationVariables?: any;
    softDeleteMutationLoading: boolean;
    softDeleteMutationVariables?: any;
    syncCategoryMutationLoading: boolean;
    syncCategoryMutationVariables?: any;
    isInactiveView?: boolean;
}

function UserTable({
    users, categoryMapping, isLoading, isError, error, page, totalPages, onPageChange, // 👈 Destructure categoryMapping
    handleToggleActive, handleDelete, handleSyncCategory,
    toggleActiveMutationLoading, toggleActiveMutationVariables,
    softDeleteMutationLoading, softDeleteMutationVariables,
    syncCategoryMutationLoading, syncCategoryMutationVariables,
    isInactiveView = false
}: UserTableProps) {
    const isTogglingUser = (userId: string) => toggleActiveMutationLoading && toggleActiveMutationVariables === userId;
    const isDeletingUser = (userId: string) => softDeleteMutationLoading && softDeleteMutationVariables === userId;
    const isSyncingUser = (userId: string) => syncCategoryMutationLoading && syncCategoryMutationVariables === userId;

    return (
        <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nama</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Peran</TableHead>
                        <TableHead>Kategori Harga</TableHead>
                        <TableHead>Tanggal Bergabung</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <AnimatePresence mode="wait">
                    <motion.tbody
                        key={page + (isInactiveView ? 'inactive' : 'active')}
                        initial="hidden" animate="visible" exit="exit"
                        variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
                    >
                        {isLoading && <TableRow><TableCell colSpan={7} className="text-center h-24"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground"/></TableCell></TableRow>}
                        {isError && <TableRow><TableCell colSpan={7} className="text-center h-24 text-red-500">{error?.message || 'Gagal memuat data'}</TableCell></TableRow>}

                        {users && users.length > 0 ? (
                            users.map((user) => (
                                <motion.tr key={user.id} variants={itemVariants}>
                                    <TableCell className="font-medium">{user.name || '-'}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell><RoleBadge role={user.role} /></TableCell>
                                    
                                    {/* 👇👇 PENGGUNAAN MAPPING DINAMIS 👇👇 */}
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <CategoryBadge 
                                          id={user.accuratePriceCategoryId} 
                                          name={user.accuratePriceCategoryId ? categoryMapping[user.accuratePriceCategoryId] : undefined}
                                        />
                                        {user.accurateCustomerNo && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleSyncCategory(user.id)}
                                            disabled={isSyncingUser(user.id)}
                                            title="Sinkronkan kategori dari Accurate"
                                            className="h-7 w-7 p-0"
                                          >
                                            {isSyncingUser(user.id) ? (
                                              <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                              <RefreshCw className="h-3 w-3" />
                                            )}
                                          </Button>
                                        )}
                                      </div>
                                    </TableCell>
                                    {/* 👆👆 SELESAI 👆👆 */}

                                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                id={`active-switch-${user.id}`}
                                                checked={user.isActive}
                                                onCheckedChange={() => handleToggleActive(user.id, user.isActive)}
                                                disabled={isTogglingUser(user.id)}
                                                aria-label={user.isActive ? 'Nonaktifkan pengguna' : 'Aktifkan pengguna'}
                                            />
                                            <Label htmlFor={`active-switch-${user.id}`} className={user.isActive ? 'text-green-600' : 'text-gray-500'}>
                                                {user.isActive ? 'Aktif' : 'Nonaktif'}
                                            </Label>
                                            {isTogglingUser(user.id) && (
                                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground"/>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/users/edit?id=${user.id}`}>
                                                        <Edit className="mr-2 h-4 w-4" /> Edit Pengguna
                                                    </Link>
                                                </DropdownMenuItem>
                                                {user.role === 'RESELLER' && (
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/users/discounts?id=${user.id}`}>
                                                            <Percent className="mr-2 h-4 w-4" /> Kelola Diskon
                                                        </Link>
                                                    </DropdownMenuItem>
                                                )}
                                                {!isInactiveView && (
                                                    <DropdownMenuItem
                                                        onClick={() => handleDelete(user.id)}
                                                        className="text-red-600 focus:text-red-600"
                                                        disabled={!user.isActive || isDeletingUser(user.id)}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" /> Nonaktifkan
                                                    </DropdownMenuItem>
                                                )}
                                                {isInactiveView && (
                                                    <DropdownMenuItem
                                                        onClick={() => handleToggleActive(user.id, user.isActive)}
                                                        className="text-green-600 focus:text-green-600"
                                                        disabled={user.isActive || isTogglingUser(user.id)}
                                                    >
                                                        <CheckCircle className="mr-2 h-4 w-4" /> Aktifkan Kembali
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </motion.tr>
                            ))
                        ) : (
                            !isLoading && <TableRow><TableCell colSpan={7} className="text-center h-24">{isInactiveView ? 'Tidak ada pengguna nonaktif.' : 'Pengguna tidak ditemukan.'}</TableCell></TableRow>
                        )}
                    </motion.tbody>
                </AnimatePresence>
            </Table>

            {totalPages > 1 && (
                 <div className="flex items-center justify-end space-x-2 pt-4">
                     <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page === 1}><ChevronLeft className="h-4 w-4" /><span>Sebelumnya</span></Button>
                     <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page === totalPages}><span>Berikutnya</span><ChevronRight className="h-4 w-4" /></Button>
                 </div>
             )}
        </>
    );
}