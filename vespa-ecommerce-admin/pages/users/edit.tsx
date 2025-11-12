// file: vespa-ecommerce-admin/pages/users/edit.tsx

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

import { getUserById, updateUser, User } from '@/services/userService';
import { getPriceCategories, PriceCategory } from '@/services/accurateService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  name: z.string().min(1, 'Nama tidak boleh kosong'),
  email: z.string().email('Email tidak valid'),
  role: z.enum(['ADMIN', 'RESELLER', 'MEMBER']),
  accurateCustomerNo: z.string().optional(),
  accuratePriceCategoryId: z.coerce.number().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

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
    
    return user ? <EditUserForm user={user} /> : null;
}

function EditUserForm({ user }: { user: User }) {
    const router = useRouter();
    const { id } = router.query;
    const queryClient = useQueryClient();

    const [priceCategories, setPriceCategories] = useState<PriceCategory[]>([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: user.name,
            email: user.email,
            role: user.role,
            accurateCustomerNo: user.accurateCustomerNo || '',
            accuratePriceCategoryId: user.accuratePriceCategoryId || null,
        },
    });

    const currentRole = form.watch('role');

    useEffect(() => {
        const fetchCategories = async () => {
            setIsLoadingCategories(true);
            try {
                const categories = await getPriceCategories();
                setPriceCategories(categories);
            } catch (error) {
                console.error('Gagal mengambil kategori harga:', error);
                toast.error('Gagal memuat daftar kategori harga dari Accurate.');
            } finally {
                setIsLoadingCategories(false);
            }
        };

        fetchCategories();
    }, []);

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
        
        if (!updateData.accurateCustomerNo) updateData.accurateCustomerNo = null;
        if (!updateData.accuratePriceCategoryId) updateData.accuratePriceCategoryId = null;
        
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

                            <FormField name="accuratePriceCategoryId" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Kategori Penjualan (Harga)</FormLabel>
                                    <Select 
                                        onValueChange={(value) => {
                                            field.onChange(value === 'auto' ? null : Number(value));
                                        }} 
                                        value={field.value?.toString() || 'auto'} 
                                        disabled={isLoadingCategories}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={isLoadingCategories ? "Memuat..." : "Pilih Kategori Harga"} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="auto">-- Otomatis Berdasarkan Role --</SelectItem>
                                            {priceCategories.map((category) => (
                                                <SelectItem key={category.id} value={category.id.toString()}>
                                                    {category.name} {category.isDefault ? '(Default)' : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription className="text-xs">
                                        {currentRole === 'MEMBER' 
                                            ? "Untuk MEMBER, biasanya menggunakan kategori 'Umum'."
                                            : currentRole === 'RESELLER'
                                            ? "Pilih level harga untuk Reseller ini (misal: Member-1, Member-2)."
                                            : "Kategori harga khusus untuk user ini."}
                                    </FormDescription>
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