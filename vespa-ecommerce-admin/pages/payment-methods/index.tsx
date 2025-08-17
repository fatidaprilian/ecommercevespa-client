// file: pages/payment-methods/index.tsx

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, Landmark } from 'lucide-react';

import {
  getAllPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  PaymentMethod,
  PaymentMethodData,
} from '../services/paymentMethodService';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

const formSchema = z.object({
  bankName: z.string().min(2, { message: 'Nama bank harus diisi.' }),
  accountHolder: z.string().min(2, { message: 'Nama pemilik harus diisi.' }),
  accountNumber: z.string().min(5, { message: 'Nomor rekening tidak valid.' }),
  logoUrl: z.string().url({ message: 'URL logo tidak valid.' }).optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});
type FormValues = z.infer<typeof formSchema>;

function PaymentMethodForm({
  method,
  onClose,
}: {
  method?: PaymentMethod;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isEditing = !!method;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bankName: method?.bankName || '',
      accountHolder: method?.accountHolder || '',
      accountNumber: method?.accountNumber || '',
      logoUrl: method?.logoUrl || '',
      isActive: method?.isActive ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: PaymentMethodData) =>
      isEditing ? updatePaymentMethod(method.id, data) : createPaymentMethod(data),
    onSuccess: () => {
      toast.success(`Metode pembayaran berhasil ${isEditing ? 'diperbarui' : 'dibuat'}!`);
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message[0] || 'Operasi gagal.');
    },
  });

  // --- PERBAIKAN UTAMA DI FUNGSI INI ---
  const onSubmit = (data: FormValues) => {
    // Buat objek baru dari data form
    const payload: Partial<PaymentMethodData> = { ...data };

    // Jika logoUrl adalah string kosong, hapus properti itu dari payload
    // agar backend menerima field ini sebagai 'undefined' dan @IsOptional() berfungsi.
    if (!payload.logoUrl) {
      delete payload.logoUrl;
    }
    
    mutation.mutate(payload as PaymentMethodData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit' : 'Tambah'} Metode Pembayaran</DialogTitle>
          <DialogDescription>
            Masukkan detail rekening bank untuk pembayaran manual oleh reseller.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <FormField control={form.control} name="bankName" render={({ field }) => (
            <FormItem><FormLabel>Nama Bank</FormLabel><FormControl><Input placeholder="Contoh: Bank Central Asia" {...field} /></FormControl><FormMessage /></FormItem>
          )}/>
          <FormField control={form.control} name="accountNumber" render={({ field }) => (
            <FormItem><FormLabel>Nomor Rekening</FormLabel><FormControl><Input placeholder="1234567890" {...field} /></FormControl><FormMessage /></FormItem>
          )}/>
          <FormField control={form.control} name="accountHolder" render={({ field }) => (
            <FormItem><FormLabel>Nama Pemilik Rekening</FormLabel><FormControl><Input placeholder="PT Vespa Sejahtera" {...field} /></FormControl><FormMessage /></FormItem>
          )}/>
          <FormField control={form.control} name="logoUrl" render={({ field }) => (
            <FormItem><FormLabel>URL Logo Bank (Opsional)</FormLabel><FormControl><Input placeholder="https://example.com/bca.png" {...field} /></FormControl><FormMessage /></FormItem>
          )}/>
          <FormField control={form.control} name="isActive" render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <FormLabel>Aktifkan Metode Ini</FormLabel>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
            </FormItem>
          )}/>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

export default function PaymentMethodsPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | undefined>(undefined);

  const { data: methods, isLoading, isError, error } = useQuery<PaymentMethod[], Error>({
    queryKey: ['paymentMethods'],
    queryFn: getAllPaymentMethods,
  });

  const deleteMutation = useMutation({
    mutationFn: deletePaymentMethod,
    onSuccess: () => {
      toast.success('Metode pembayaran berhasil dihapus.');
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menghapus.');
    },
  });

  const handleEdit = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedMethod(undefined);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Anda yakin ingin menghapus metode pembayaran ini?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Metode Pembayaran Manual</h1>
          <p className="text-muted-foreground">Kelola rekening bank untuk pembayaran dari reseller.</p>
        </div>
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2 h-4 w-4" /> Tambah Metode
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Daftar Rekening</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Bank</TableHead><TableHead>Nomor Rekening</TableHead><TableHead>Atas Nama</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={5} className="h-24 text-center">Memuat...</TableCell></TableRow>}
              {isError && <TableRow><TableCell colSpan={5} className="h-24 text-center text-red-500">{error.message}</TableCell></TableRow>}
              {methods && methods.length > 0 ? (
                methods.map((method) => (
                  <TableRow key={method.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                        {method.logoUrl ? <img src={method.logoUrl} alt={method.bankName} className="h-6 w-auto"/> : <Landmark className="h-5 w-5 text-muted-foreground"/>}
                        {method.bankName}
                    </TableCell>
                    <TableCell className="font-mono">{method.accountNumber}</TableCell>
                    <TableCell>{method.accountHolder}</TableCell>
                    <TableCell>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${method.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {method.isActive ? 'Aktif' : 'Non-Aktif'}
                        </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(method)}><Edit className="mr-2 h-4 w-4"/> Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(method.id)} className="text-red-600 focus:text-red-600"><Trash2 className="mr-2 h-4 w-4"/> Hapus</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                !isLoading && <TableRow><TableCell colSpan={5} className="h-24 text-center">Belum ada metode pembayaran manual.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
            <PaymentMethodForm method={selectedMethod} onClose={() => setIsDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}