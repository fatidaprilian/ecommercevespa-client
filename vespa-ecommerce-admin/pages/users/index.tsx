import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { MoreHorizontal, Edit, Trash2, Search, Percent, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { getUsers, deleteUser, User } from '@/services/userService';

const pageVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { ease: 'easeOut', duration: 0.4 } },
  exit: { opacity: 0, transition: { ease: 'easeIn', duration: 0.2 } },
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
};

const RoleBadge = ({ role }: { role: string }) => {
    const roleStyles: { [key: string]: string } = {
        ADMIN: 'bg-red-100 text-red-800',
        RESELLER: 'bg-blue-100 text-blue-800',
        MEMBER: 'bg-gray-100 text-gray-800',
    };
    return (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${roleStyles[role] || roleStyles.MEMBER}`}>
            {role}
        </span>
    );
};

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const ITEMS_PER_PAGE = 10;

  const { data: users, isLoading, isError, error } = useQuery<User[], Error>({
    queryKey: ['users'],
    queryFn: getUsers,
  });

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchTerm) return users;

    const lowercasedTerm = searchTerm.toLowerCase();
    return users.filter(user =>
      user.name.toLowerCase().includes(lowercasedTerm) ||
      user.email.toLowerCase().includes(lowercasedTerm)
    );
  }, [users, searchTerm]);

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = useMemo(() => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredUsers, page]);

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Pengguna berhasil dihapus.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menghapus pengguna.');
    },
  });

  const handleDelete = (id: string) => {
    if (window.confirm('Anda yakin ingin menghapus pengguna ini?')) {
      deleteMutation.mutate(id);
    }
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
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>Daftar Pengguna</CardTitle>
                    <CardDescription>
                      Total {filteredUsers.length} pengguna ditemukan. Halaman {page} dari {totalPages || 1}.
                    </CardDescription>
                </div>
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari berdasarkan nama atau email..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => {setSearchTerm(e.target.value); setPage(1);}} // Reset ke halaman 1 saat mencari
                    />
                </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Peran</TableHead>
                  <TableHead>Tanggal Bergabung</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <AnimatePresence mode="wait">
                <motion.tbody
                    key={page + searchTerm}
                    initial="hidden" animate="visible" exit="exit"
                    variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
                >
                    {isLoading && <TableRow><TableCell colSpan={5} className="text-center h-24"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground"/></TableCell></TableRow>}
                    {isError && <TableRow><TableCell colSpan={5} className="text-center h-24 text-red-500">{error.message}</TableCell></TableRow>}
                    
                    {paginatedUsers && paginatedUsers.length > 0 ? (
                        paginatedUsers.map((user) => (
                        <motion.tr key={user.id} variants={itemVariants}>
                            <TableCell className="font-medium">{user.name}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell><RoleBadge role={user.role} /></TableCell>
                            <TableCell>{formatDate(user.createdAt)}</TableCell>
                            <TableCell className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                    <Link href={`/users/edit?id=${user.id}`}>
                                    <Edit className="mr-2 h-4 w-4" /> Edit Peran
                                    </Link>
                                </DropdownMenuItem>
                                {user.role === 'RESELLER' && (
                                    <DropdownMenuItem asChild>
                                    <Link href={`/users/discounts?id=${user.id}`}>
                                        <Percent className="mr-2 h-4 w-4" /> Kelola Diskon
                                    </Link>
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => handleDelete(user.id)} className="text-red-600 focus:text-red-600">
                                    <Trash2 className="mr-2 h-4 w-4" /> Hapus
                                </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            </TableCell>
                        </motion.tr>
                        ))
                    ) : (
                        !isLoading && <TableRow><TableCell colSpan={5} className="text-center h-24">Pengguna tidak ditemukan.</TableCell></TableRow>
                    )}
                </motion.tbody>
              </AnimatePresence>
            </Table>

            {totalPages > 1 && (
                <div className="flex items-center justify-end space-x-2 pt-4">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1}>
                        <ChevronLeft className="h-4 w-4" />
                        <span>Sebelumnya</span>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
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