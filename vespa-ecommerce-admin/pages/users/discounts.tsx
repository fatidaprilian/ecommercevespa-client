import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowLeft, PlusCircle, Trash2, Percent, Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDebounce } from 'use-debounce';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { getUserById } from '@/services/userService';
import { getCategories, Category, PaginatedCategories } from '@/services/categoryService';
import { searchProducts, Product } from '@/services/productService';
import api from '@/lib/api';

const defaultDiscountSchema = z.object({
  defaultDiscountPercentage: z.coerce.number().min(0, "Diskon tidak boleh negatif.").max(100, "Diskon maksimal 100."),
});
type DefaultDiscountFormValues = z.infer<typeof defaultDiscountSchema>;

const setDiscountSchema = z.object({
    discountPercentage: z.coerce.number().min(0, "Diskon tidak boleh negatif.").max(100, "Diskon maksimal 100."),
});
type SetDiscountFormValues = z.infer<typeof setDiscountSchema>;

const getDiscounts = async (userId: string, page: number, limit: number) => {
  const { data } = await api.get(`/discounts/user/${userId}`, { params: { page, limit } });
  return data;
};
const updateDefaultDiscount = (userId: string, defaultDiscountPercentage: number) => {
    return api.patch(`/discounts/user/${userId}/default`, { defaultDiscountPercentage });
};
const addDiscountRule = (userId: string, payload: any) => {
    return api.post(`/discounts/user/${userId}/rules`, payload);
};
const removeDiscountRule = (userId: string, ruleId: string) => {
    return api.delete(`/discounts/user/${userId}/rules/${ruleId}`);
};

const DiscountPageSkeleton = () => (
    <div className="space-y-6 animate-pulse">
        <div className="h-9 w-48 bg-gray-200 rounded-md"></div>
        <Card><CardHeader><div className="h-6 w-1/2 bg-gray-300 rounded-md"></div><div className="h-4 w-3/4 bg-gray-200 rounded-md mt-2"></div></CardHeader></Card>
        <div className="space-y-8">
            <Card><CardContent className="h-40 bg-gray-200 rounded-lg"></CardContent></Card>
            <Card><CardContent className="h-60 bg-gray-200 rounded-lg"></CardContent></Card>
        </div>
    </div>
);

export default function ManageDiscountsPage() {
    const router = useRouter();
    const { id } = router.query;
    const userId = typeof id === 'string' ? id : '';

    const { data: user, isLoading: isLoadingUser } = useQuery({
        queryKey: ['user', userId],
        queryFn: () => getUserById(userId),
        enabled: !!userId,
    });

    if (isLoadingUser) {
        return <DiscountPageSkeleton />;
    }

    return (
        <div className="space-y-6">
            <Button variant="outline" size="sm" asChild>
                <Link href="/users"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Link>
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle>Kelola Diskon Reseller</CardTitle>
                    <CardDescription>Atur diskon untuk <span className="font-semibold">{user?.name} ({user?.email})</span>.</CardDescription>
                </CardHeader>
            </Card>
            <DefaultDiscountForm userId={userId} />
            <CategoryDiscountSection userId={userId} />
            <ProductDiscountSection userId={userId} />
        </div>
    );
}

function DefaultDiscountForm({ userId }: { userId: string }) {
    const queryClient = useQueryClient();
    const { data, isLoading } = useQuery({
        queryKey: ['discounts', userId, 'default'],
        queryFn: () => getDiscounts(userId, 1, 1),
        enabled: !!userId,
    });

    const form = useForm<DefaultDiscountFormValues>({
        resolver: zodResolver(defaultDiscountSchema),
        defaultValues: { defaultDiscountPercentage: 0 },
    });

    useEffect(() => {
        if (data) {
            form.reset({ defaultDiscountPercentage: data.defaultDiscountPercentage });
        }
    }, [data, form]);
    
    const mutation = useMutation({
        mutationFn: (vars: { value: number }) => updateDefaultDiscount(userId, vars.value),
        onSuccess: () => {
            toast.success("Diskon dasar diperbarui!");
            queryClient.invalidateQueries({queryKey: ['discounts', userId]});
        },
        onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal menyimpan.'),
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Diskon Dasar (Default)</CardTitle>
                <CardDescription>Diskon ini berlaku jika tidak ada aturan yang lebih spesifik.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(d => mutation.mutate({ value: d.defaultDiscountPercentage }))} className="flex items-end gap-4">
                        <FormField
                            control={form.control}
                            name="defaultDiscountPercentage"
                            render={({ field }) => (
                                <FormItem className="w-full max-w-xs">
                                    <FormLabel>Persentase Diskon (%)</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} disabled={isLoading || mutation.isPending}/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isLoading || mutation.isPending}>
                            {mutation.isPending ? <Loader2 className="animate-spin h-4 w-4"/> : 'Simpan'}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

function CategoryDiscountSection({ userId }: { userId: string }) {
    const [page, setPage] = useState(1);
    const queryClient = useQueryClient();
    const [dialogState, setDialogState] = useState<{ open: boolean; item: Category | null }>({ open: false, item: null });

    const { data: discountsData, isLoading } = useQuery({
        queryKey: ['discounts', 'categories', userId, page],
        queryFn: () => getDiscounts(userId, page, 5),
        keepPreviousData: true,
    });
    
    const mutation = useMutation({
        mutationFn: (vars: any) => vars.action === 'add' ? addDiscountRule(userId, vars.payload) : removeDiscountRule(userId, vars.payload.ruleId),
        onSuccess: (_, vars) => {
            toast.success(`Aturan diskon berhasil di${vars.action === 'add' ? 'tambah' : 'hapus'}.`);
            queryClient.invalidateQueries({queryKey: ['discounts', 'categories', userId]});
        },
        onError: (err: any) => toast.error(err.response?.data?.message || 'Operasi gagal.'),
    });

    const meta = discountsData?.categoryDiscounts.meta;

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Diskon per Kategori</CardTitle>
                            <CardDescription>Prioritas menengah. Menggantikan diskon dasar untuk semua produk dalam kategori yang dipilih.</CardDescription>
                        </div>
                        <CategoryPicker onSelect={(cat) => setDialogState({ open: true, item: cat })} />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Kategori</TableHead><TableHead className="w-[120px]">Diskon (%)</TableHead><TableHead className="w-[50px] text-right">Aksi</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {isLoading && <TableRow><TableCell colSpan={3} className="h-24 text-center"><Loader2 className="mx-auto animate-spin text-muted-foreground"/></TableCell></TableRow>}
                            {!isLoading && discountsData?.categoryDiscounts.data.length === 0 && <TableRow><TableCell colSpan={3} className="text-center h-24 text-muted-foreground">Belum ada diskon.</TableCell></TableRow>}
                            {discountsData?.categoryDiscounts.data.map((item: any) => (
                                <TableRow key={item.id}><TableCell className="font-medium">{item.category.name}</TableCell><TableCell>{item.discountPercentage}%</TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => mutation.mutate({ action: 'remove', payload: { ruleId: item.id }})}><Trash2 className="h-4 w-4 text-red-500"/></Button></TableCell></TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {meta && meta.lastPage > 1 && (
                        <div className="flex items-center justify-end space-x-2 pt-4">
                            <span className="text-sm text-muted-foreground">Halaman {meta.page} dari {meta.lastPage}</span>
                            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
                            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === meta.lastPage}><ChevronRight className="h-4 w-4" /></Button>
                        </div>
                    )}
                </CardContent>
            </Card>
            <SetDiscountDialog
                isOpen={dialogState.open}
                onClose={() => setDialogState({ open: false, item: null })}
                itemName={dialogState.item?.name || ''}
                onSubmit={(discountPercentage) => {
                    if(dialogState.item) {
                        mutation.mutate({ action: 'add', payload: { type: 'category', ruleId: dialogState.item.id, discountPercentage }});
                    }
                }}
            />
        </>
    );
}

function ProductDiscountSection({ userId }: { userId: string }) {
    const [page, setPage] = useState(1);
    const queryClient = useQueryClient();
    const [dialogState, setDialogState] = useState<{ open: boolean; item: Product | null }>({ open: false, item: null });

    const { data: discountsData, isLoading } = useQuery({
        queryKey: ['discounts', 'products', userId, page],
        queryFn: () => getDiscounts(userId, page, 5),
        keepPreviousData: true,
    });
    
    const mutation = useMutation({
        mutationFn: (vars: any) => vars.action === 'add' ? addDiscountRule(userId, vars.payload) : removeDiscountRule(userId, vars.payload.ruleId),
        onSuccess: (_, vars) => {
            toast.success(`Aturan diskon berhasil di${vars.action === 'add' ? 'tambah' : 'hapus'}.`);
            queryClient.invalidateQueries({queryKey: ['discounts', 'products', userId]});
        },
        onError: (err: any) => toast.error(err.response?.data?.message || 'Operasi gagal.'),
    });

    const meta = discountsData?.productDiscounts.meta;

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Diskon per Produk</CardTitle>
                        <CardDescription>Prioritas tertinggi. Menggantikan semua aturan diskon lain untuk produk yang dipilih.</CardDescription>
                    </div>
                    <ProductPicker onSelect={(prod) => setDialogState({ open: true, item: prod })} />
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Produk (SKU)</TableHead><TableHead className="w-[120px]">Diskon (%)</TableHead><TableHead className="w-[50px] text-right">Aksi</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {isLoading && <TableRow><TableCell colSpan={3} className="h-24 text-center"><Loader2 className="mx-auto animate-spin text-muted-foreground"/></TableCell></TableRow>}
                            {!isLoading && discountsData?.productDiscounts.data.length === 0 && <TableRow><TableCell colSpan={3} className="text-center h-24 text-muted-foreground">Belum ada diskon.</TableCell></TableRow>}
                            {discountsData?.productDiscounts.data.map((item: any) => (
                                <TableRow key={item.id}><TableCell>{item.product.name} <span className="text-muted-foreground">({item.product.sku})</span></TableCell><TableCell>{item.discountPercentage}%</TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => mutation.mutate({ action: 'remove', payload: { ruleId: item.id }})}><Trash2 className="h-4 w-4 text-red-500"/></Button></TableCell></TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {meta && meta.lastPage > 1 && (
                        <div className="flex items-center justify-end space-x-2 pt-4">
                            <span className="text-sm text-muted-foreground">Halaman {meta.page} dari {meta.lastPage}</span>
                            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
                            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === meta.lastPage}><ChevronRight className="h-4 w-4" /></Button>
                        </div>
                    )}
                </CardContent>
            </Card>
            <SetDiscountDialog
                isOpen={dialogState.open}
                onClose={() => setDialogState({ open: false, item: null })}
                itemName={dialogState.item?.name || ''}
                onSubmit={(discountPercentage) => {
                    if (dialogState.item) {
                        mutation.mutate({ action: 'add', payload: { type: 'product', ruleId: dialogState.item.id, discountPercentage } });
                    }
                }}
            />
        </>
    );
}

function SetDiscountDialog({ isOpen, onClose, itemName, onSubmit }: { isOpen: boolean, onClose: () => void, itemName: string, onSubmit: (discount: number) => void }) {
    const form = useForm<SetDiscountFormValues>({
        resolver: zodResolver(setDiscountSchema),
        defaultValues: { discountPercentage: 10 },
    });
    
    const handleSubmit = (values: SetDiscountFormValues) => {
        onSubmit(values.discountPercentage);
        onClose();
    };

    useEffect(() => {
        if(isOpen) {
            form.reset({ discountPercentage: 10 });
        }
    }, [isOpen, form]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)}>
                        <DialogHeader>
                            <DialogTitle>Atur Diskon</DialogTitle>
                            <DialogDescription>
                                Masukkan persentase diskon untuk <span className="font-semibold">{itemName}</span>.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <FormField
                                control={form.control}
                                name="discountPercentage"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Persentase Diskon (%)</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} autoFocus onSelect={(e) => e.currentTarget.select()}/>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
                            <Button type="submit">Simpan Diskon</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function CategoryPicker({ onSelect }: { onSelect: (category: Category) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

    const { data: categoriesResponse, isLoading } = useQuery<PaginatedCategories, Error>({
        queryKey: ['categories', 1, debouncedSearchTerm],
        queryFn: () => getCategories({ page: 1, search: debouncedSearchTerm, limit: 20 }),
    });
    const categories = categoriesResponse?.data;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" /> Tambah
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Pilih Kategori</DialogTitle>
                </DialogHeader>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari nama kategori..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="max-h-80 overflow-y-auto">
                    {isLoading && (
                        <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mencari...
                        </div>
                    )}
                    {!isLoading && !categories?.length && (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            Kategori tidak ditemukan.
                        </div>
                    )}
                    {categories?.map(cat => (
                        <div
                            key={cat.id}
                            onClick={() => {
                                onSelect(cat);
                                setIsOpen(false);
                                setSearchTerm('');
                            }}
                            className="p-2 rounded-md hover:bg-accent cursor-pointer"
                        >
                            {cat.name}
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function ProductPicker({ onSelect }: { onSelect: (product: Product) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedTerm, setDebouncedTerm] = useState("");
    useEffect(() => { const timer = setTimeout(() => { setDebouncedTerm(searchTerm); }, 500); return () => { clearTimeout(timer); }; }, [searchTerm]);
    const { data: searchResults, isLoading } = useQuery({ queryKey: ['productSearch', debouncedTerm], queryFn: () => searchProducts(debouncedTerm), enabled: debouncedTerm.length >= 2, });
    return(<Dialog open={isOpen} onOpenChange={setIsOpen}><DialogTrigger asChild><Button type="button" variant="outline" size="sm"><PlusCircle className="mr-2 h-4 w-4"/> Tambah</Button></DialogTrigger><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Pilih Produk</DialogTitle></DialogHeader><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Ketik nama atau SKU produk..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div><div className="max-h-96 overflow-y-auto border rounded-md mt-2">{isLoading && (<div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center"><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Mencari...</div>)}{!isLoading && !searchResults?.length && debouncedTerm.length >= 2 && (<div className="p-4 text-center text-sm text-muted-foreground">Produk tidak ditemukan.</div>)}{searchResults?.map(prod => (<div key={prod.id} onClick={() => { onSelect(prod); setIsOpen(false); }} className="p-3 hover:bg-accent cursor-pointer flex justify-between items-center border-b"><div><p className="font-semibold">{prod.name}</p><p className="text-sm text-muted-foreground">SKU: {prod.sku}</p></div><span className="text-sm">Rp{prod.price.toLocaleString('id-ID')}</span></div>))}</div></DialogContent></Dialog>);
}