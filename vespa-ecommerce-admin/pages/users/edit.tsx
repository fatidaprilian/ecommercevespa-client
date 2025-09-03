// file: vespa-ecommerce-admin/pages/users/edit.tsx

import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

import { getUserById, updateUser, User } from '@/services/userService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  name: z.string().min(1, 'Nama tidak boleh kosong'),
  email: z.string().email('Email tidak valid'),
  role: z.enum(['ADMIN', 'RESELLER', 'MEMBER']),
  accurateCustomerNo: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// Komponen utama yang bertugas memuat data
export default function EditUserPage() {
    const router = useRouter();
    const { id } = router.query;

    const { data: user, isLoading, isError } = useQuery<User, Error>({
        queryKey: ['user', id],
        queryFn: () => getUserById(id as string),
        enabled: !!id,
    });

    if (isLoading) return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>;
    if (isError) return <div className="text-red-500 text-center">Gagal memuat data pengguna.</div>;
    
    // Form hanya akan di-render jika data 'user' sudah ada
    return user ? <EditUserForm user={user} /> : null;
}

// Komponen baru yang khusus menangani logika dan tampilan form
function EditUserForm({ user }: { user: User }) {
    const router = useRouter();
    const { id } = router.query;
    const queryClient = useQueryClient();

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        // Data 'user' dijamin ada di sini, sehingga `defaultValues` akan selalu benar
        // pada render pertama komponen ini. Tidak perlu lagi `useEffect`.
        defaultValues: {
            name: user.name,
            email: user.email,
            role: user.role,
            accurateCustomerNo: user.accurateCustomerNo || '',
        },
    });

    const mutation = useMutation({
        mutationFn: (values: Omit<FormValues, 'email'>) => updateUser(id as string, values),
        onSuccess: () => {
            toast.success('Data pengguna berhasil diperbarui!');
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['user', id] });
            router.push('/users');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Gagal memperbarui data.');
        },
    });

    const onSubmit = (values: FormValues) => {
        const { email, ...updateData } = values;
        mutation.mutate(updateData);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Edit Pengguna</h1>
                    <p className="text-muted-foreground">
                        Perbarui detail untuk {user.name}.
                    </p>
                </div>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Informasi Pengguna</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField name="name" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nama Lengkap</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField name="email" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl><Input type="email" {...field} readOnly className="focus:ring-0 focus:ring-offset-0" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            
                            <FormField name="role" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Peran (Role)</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Pilih peran..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="MEMBER">MEMBER</SelectItem>
                                            <SelectItem value="RESELLER">RESELLER</SelectItem>
                                            <SelectItem value="ADMIN">ADMIN</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            
                            <FormField name="accurateCustomerNo" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nomor Pelanggan Accurate</FormLabel>
                                    <FormControl><Input placeholder="Contoh: C.0001" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" type="button" onClick={() => router.push('/users')}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Simpan Perubahan
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}