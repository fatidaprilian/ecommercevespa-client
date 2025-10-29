// pages/users/index.tsx

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { MoreHorizontal, Edit, Trash2, Search, Percent, Loader2, ChevronLeft, ChevronRight, CheckCircle, XCircle } from 'lucide-react'; // Impor ikon status
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api'; // Pastikan API client diimpor

import { Button } from '@/components/ui/button'; //
import { Input } from '@/components/ui/input'; //
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'; //
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'; //
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'; //
import { Switch } from '@/components/ui/switch'; // <-- Import Switch
import { Label } from '@/components/ui/label'; // <-- Import Label
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // <-- Import Tabs
// Ganti nama User menjadi UserType dan import fungsi baru
import { getActiveUsers, getInactiveUsers, deleteUser, toggleUserActiveStatus, User as UserType } from '@/services/userService'; //


// Definisikan tipe User dengan isActive (sesuaikan jika perlu dari userService)
interface User extends UserType {
    isActive: boolean;
    // createdAt might be missing in UserType, ensure it exists if used
    createdAt: string; // Add createdAt if it's used below
}

// Komponen pageVariants, itemVariants, formatDate, RoleBadge tetap sama
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
// -- Akhir komponen --

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active'); // State for Tabs
  const ITEMS_PER_PAGE = 10;

  // --- Modifikasi useQuery ---
  // Ganti nama queryFn berdasarkan activeTab
  const queryFn = activeTab === 'active' ? getActiveUsers : getInactiveUsers; //
  // Gunakan activeTab di queryKey agar data di-cache terpisah
  const { data: usersData, isLoading, isError, error } = useQuery<User[], Error>({
      queryKey: ['users', activeTab], // Tambahkan activeTab ke queryKey
      queryFn: queryFn,
  });
  // Ganti nama variabel users
  const users = usersData;
  // --- Akhir Modifikasi ---


  // Filter dan Paginasi (logika filter tetap sama)
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


  // --- Mutation untuk Soft Delete (nonaktifkan) ---
  const softDeleteMutation = useMutation({
    mutationFn: deleteUser, // Menggunakan fungsi deleteUser dari service
    onSuccess: (data, userId) => {
        toast.success(data.message || 'Pengguna berhasil dinonaktifkan.');
        // Invalidate kedua query agar data di kedua tab diperbarui
        queryClient.invalidateQueries({ queryKey: ['users', 'active'] });
        queryClient.invalidateQueries({ queryKey: ['users', 'inactive'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menonaktifkan pengguna.'); //
    },
  });

  const handleDelete = (id: string) => {
    if (window.confirm('Anda yakin ingin menonaktifkan pengguna ini? Mereka tidak akan bisa login lagi.')) { //
      softDeleteMutation.mutate(id); //
    }
  };
  // --- Akhir Soft Delete ---


  // --- Mutation untuk Toggle isActive ---
  const toggleActiveMutation = useMutation({
    mutationFn: toggleUserActiveStatus, // Menggunakan fungsi baru dari service
    onSuccess: (data, userId) => {
        const updatedUser = data.user;
        toast.success(data.message || `Status pengguna diubah.`);
        // Invalidate kedua query agar data di kedua tab diperbarui
        queryClient.invalidateQueries({ queryKey: ['users', 'active'] });
        queryClient.invalidateQueries({ queryKey: ['users', 'inactive'] });
    },
    onError: (err: any, userId) => {
      toast.error(err.response?.data?.message || 'Gagal mengubah status pengguna.'); //
      // Rollback optimistic update jika diperlukan (implementasi detail tergantung kebutuhan)
       queryClient.invalidateQueries({ queryKey: ['users', activeTab] });
    },
  });

  const handleToggleActive = (userId: string, currentStatus: boolean) => {
      // Tidak perlu optimistic update jika invalidateQueries sudah cukup cepat
      toggleActiveMutation.mutate(userId); //
  };
  // --- Akhir Toggle ---


  // --- Render Komponen (JSX) ---
  return (
    <motion.div initial="hidden" animate="visible" variants={pageVariants} className="space-y-6">
      {/* Header (tidak berubah) */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
         <div>
            <h1 className="text-2xl font-bold tracking-tight">Manajemen Pengguna</h1>
            <p className="text-muted-foreground">Kelola pengguna dan peran akses mereka.</p>
         </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        {/* --- Tambahkan Tabs --- */}
        <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value as 'active' | 'inactive'); setPage(1); setSearchTerm(''); }}>
          <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
            <TabsList>
              <TabsTrigger value="active">Pengguna Aktif</TabsTrigger>
              <TabsTrigger value="inactive">Pengguna Nonaktif</TabsTrigger>
            </TabsList>
            {/* Pindahkan Search Input ke sini */}
            <div className="relative w-full sm:w-auto sm:max-w-sm">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                 <Input placeholder="Cari berdasarkan nama atau email..." className="pl-9" value={searchTerm} onChange={(e) => {setSearchTerm(e.target.value); setPage(1);}} />
            </div>
          </div>

          {/* --- Konten untuk Tab Aktif --- */}
          <TabsContent value="active">
             <Card>
                <CardHeader>
                  <CardTitle>Daftar Pengguna Aktif</CardTitle>
                  <CardDescription>
                      Total {filteredUsers.length} pengguna aktif ditemukan. Halaman {page} dari {totalPages || 1}.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Gunakan komponen tabel terpisah */}
                    <UserTable
                        users={paginatedUsers}
                        isLoading={isLoading}
                        isError={isError}
                        error={error}
                        page={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                        handleToggleActive={handleToggleActive}
                        handleDelete={handleDelete} // handleDelete sekarang menonaktifkan
                        toggleActiveMutationLoading={toggleActiveMutation.isLoading}
                        toggleActiveMutationVariables={toggleActiveMutation.variables}
                        softDeleteMutationLoading={softDeleteMutation.isLoading}
                        softDeleteMutationVariables={softDeleteMutation.variables}
                        isInactiveView={false} // Tandai ini view aktif
                    />
                </CardContent>
              </Card>
          </TabsContent>

          {/* --- Konten untuk Tab Nonaktif --- */}
          <TabsContent value="inactive">
             <Card>
                <CardHeader>
                  <CardTitle>Daftar Pengguna Nonaktif</CardTitle>
                   <CardDescription>
                      Total {filteredUsers.length} pengguna nonaktif ditemukan. Halaman {page} dari {totalPages || 1}.
                  </CardDescription>
                </CardHeader>
                 <CardContent>
                    {/* Gunakan komponen tabel yang sama */}
                     <UserTable
                        users={paginatedUsers}
                        isLoading={isLoading}
                        isError={isError}
                        error={error}
                        page={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                        handleToggleActive={handleToggleActive} // Fungsi ini bisa mengaktifkan kembali
                        handleDelete={handleDelete} // handleDelete tidak relevan, tapi diteruskan
                        toggleActiveMutationLoading={toggleActiveMutation.isLoading}
                        toggleActiveMutationVariables={toggleActiveMutation.variables}
                        softDeleteMutationLoading={softDeleteMutation.isLoading}
                        softDeleteMutationVariables={softDeleteMutation.variables}
                        isInactiveView={true} // Tandai ini view nonaktif
                    />
                 </CardContent>
              </Card>
          </TabsContent>
        </Tabs>
        {/* --- Akhir Tabs --- */}
      </motion.div>
    </motion.div>
  );
}

// --- Komponen Tabel Terpisah (untuk reusability) ---
interface UserTableProps {
    users: User[];
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    page: number;
    totalPages: number;
    onPageChange: (newPage: number) => void;
    handleToggleActive: (userId: string, currentStatus: boolean) => void;
    handleDelete: (userId: string) => void; // Fungsi soft delete (nonaktifkan)
    toggleActiveMutationLoading: boolean;
    toggleActiveMutationVariables?: any; // Diperbarui menjadi any atau string | undefined
    softDeleteMutationLoading: boolean;
    softDeleteMutationVariables?: any; // Diperbarui menjadi any atau string | undefined
    isInactiveView?: boolean; // Prop baru
}

function UserTable({
    users, isLoading, isError, error, page, totalPages, onPageChange,
    handleToggleActive, handleDelete,
    toggleActiveMutationLoading, toggleActiveMutationVariables,
    softDeleteMutationLoading, softDeleteMutationVariables,
    isInactiveView = false // Default false
}: UserTableProps) {
    // Memastikan variables adalah string sebelum membandingkan
    const isTogglingUser = (userId: string) => toggleActiveMutationLoading && toggleActiveMutationVariables === userId;
    const isDeletingUser = (userId: string) => softDeleteMutationLoading && softDeleteMutationVariables === userId;

    return (
        <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nama</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Peran</TableHead>
                        <TableHead>Tanggal Bergabung</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <AnimatePresence mode="wait">
                    <motion.tbody
                        key={page + (isInactiveView ? 'inactive' : 'active')} // Key unik untuk animasi
                        initial="hidden" animate="visible" exit="exit"
                        variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
                    >
                        {isLoading && <TableRow><TableCell colSpan={6} className="text-center h-24"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground"/></TableCell></TableRow>}
                        {isError && <TableRow><TableCell colSpan={6} className="text-center h-24 text-red-500">{error?.message || 'Gagal memuat data'}</TableCell></TableRow>}

                        {users && users.length > 0 ? (
                            users.map((user) => (
                                <motion.tr key={user.id} variants={itemVariants}>
                                    <TableCell className="font-medium">{user.name || '-'}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell><RoleBadge role={user.role} /></TableCell>
                                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                id={`active-switch-${user.id}`}
                                                checked={user.isActive}
                                                onCheckedChange={() => handleToggleActive(user.id, user.isActive)}
                                                disabled={isTogglingUser(user.id)} // Gunakan fungsi helper
                                                aria-label={user.isActive ? 'Nonaktifkan pengguna' : 'Aktifkan pengguna'}
                                            />
                                            <Label htmlFor={`active-switch-${user.id}`} className={user.isActive ? 'text-green-600' : 'text-gray-500'}>
                                                {user.isActive ? 'Aktif' : 'Nonaktif'}
                                            </Label>
                                            {isTogglingUser(user.id) && ( // Gunakan fungsi helper
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
                                                {/* Tampilkan tombol Nonaktifkan hanya jika di view Aktif */}
                                                {!isInactiveView && (
                                                    <DropdownMenuItem
                                                        onClick={() => handleDelete(user.id)}
                                                        className="text-red-600 focus:text-red-600"
                                                        disabled={!user.isActive || isDeletingUser(user.id)} // Gunakan fungsi helper
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" /> Nonaktifkan
                                                    </DropdownMenuItem>
                                                )}
                                                  {/* Tampilkan tombol Aktifkan hanya jika di view Nonaktif */}
                                                  {isInactiveView && (
                                                      <DropdownMenuItem
                                                          onClick={() => handleToggleActive(user.id, user.isActive)} // Panggil toggle untuk mengaktifkan
                                                          className="text-green-600 focus:text-green-600"
                                                          disabled={user.isActive || isTogglingUser(user.id)} // Gunakan fungsi helper
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
                            !isLoading && <TableRow><TableCell colSpan={6} className="text-center h-24">{isInactiveView ? 'Tidak ada pengguna nonaktif.' : 'Pengguna tidak ditemukan.'}</TableCell></TableRow>
                        )}
                    </motion.tbody>
                </AnimatePresence>
            </Table>

            {/* Paginasi (tidak berubah) */}
            {totalPages > 1 && (
                 <div className="flex items-center justify-end space-x-2 pt-4">
                     <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page === 1}><ChevronLeft className="h-4 w-4" /><span>Sebelumnya</span></Button>
                     <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page === totalPages}><span>Berikutnya</span><ChevronRight className="h-4 w-4" /></Button>
                 </div>
             )}
        </>
    );
}
// --- Akhir Komponen Tabel ---