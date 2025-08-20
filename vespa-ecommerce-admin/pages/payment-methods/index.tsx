import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAllPaymentMethods, createPaymentMethod, updatePaymentMethod, deletePaymentMethod, PaymentMethod } from '@/services/paymentMethodService';
import { getAccurateBankAccounts, AccurateBankAccount } from '@/services/accurateService';

const formSchema = z.object({
  bankName: z.string().min(2, { message: 'Nama bank harus diisi.' }),
  accountHolder: z.string().min(2, { message: 'Nama pemilik harus diisi.' }),
  accountNumber: z.string().min(5, { message: 'Nomor rekening tidak valid.' }),
  logoUrl: z.union([z.string().url({ message: "URL logo tidak valid." }), z.literal("")]).optional(),
  isActive: z.boolean().default(true),
  // ✅ PERUBAHAN 1: Field ini sekarang akan menyimpan "id|nama"
  accurateBankData: z.string().min(3, { message: "Nama akun Accurate harus dipilih." }),
});

type FormValues = z.infer<typeof formSchema>;

function PaymentMethodForm({ method, onClose }: { method?: PaymentMethod; onClose: () => void; }) {
  const queryClient = useQueryClient();

  const { data: bankAccounts, isLoading: isLoadingBankAccounts } = useQuery<AccurateBankAccount[]>({
    queryKey: ['accurateBankAccounts'],
    queryFn: getAccurateBankAccounts,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    // ✅ PERUBAHAN 2: Inisialisasi nilai default
    defaultValues: {
      bankName: method?.bankName || '',
      accountHolder: method?.accountHolder || '',
      accountNumber: method?.accountNumber || '',
      logoUrl: method?.logoUrl || '',
      isActive: method?.isActive ?? true,
      accurateBankData: method ? `${method.accurateBankId}|${method.accurateBankName}` : '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: any) => method ? updatePaymentMethod(method.id, data) : createPaymentMethod(data),
    onSuccess: () => {
      toast.success(`Metode pembayaran berhasil ${method ? 'diperbarui' : 'dibuat'}!`);
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal menyimpan data.')
  });

  const onSubmit = (data: FormValues) => {
    // ✅ PERUBAHAN 3: Proses data sebelum dikirim ke API
    const [id, name] = data.accurateBankData.split('|');
    
    const payload: any = {
        ...data,
        accurateBankId: parseInt(id, 10),
        accurateBankName: name,
    };

    delete payload.isActive;
    delete payload.accurateBankData; // Hapus field sementara
    if (!payload.logoUrl) {
      delete payload.logoUrl;
    }

    mutation.mutate(payload);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <DialogHeader>
          <DialogTitle>{method ? 'Edit' : 'Tambah'} Metode Pembayaran Manual</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* ... FormField untuk bankName, accountNumber, accountHolder tidak berubah ... */}
          <FormField control={form.control} name="bankName" render={({ field }) => ( <FormItem><FormLabel>Nama Bank</FormLabel><FormControl><Input placeholder="Contoh: Bank Central Asia" {...field} /></FormControl><FormMessage /></FormItem> )} />
          <FormField control={form.control} name="accountNumber" render={({ field }) => ( <FormItem><FormLabel>Nomor Rekening</FormLabel><FormControl><Input placeholder="1234567890" {...field} /></FormControl><FormMessage /></FormItem> )} />
          <FormField control={form.control} name="accountHolder" render={({ field }) => ( <FormItem><FormLabel>Nama Pemilik Rekening</FormLabel><FormControl><Input placeholder="PT Vespa Part" {...field} /></FormControl><FormMessage /></FormItem> )} />

          {/* ✅ PERUBAHAN 4: Update FormField untuk dropdown */}
          <FormField control={form.control} name="accurateBankData" render={({ field }) => (
            <FormItem>
              <FormLabel>Nama Akun Kas/Bank di Accurate</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingBankAccounts}>
                    <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder={isLoadingBankAccounts ? "Memuat data bank..." : "Pilih akun dari Accurate..."} />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {bankAccounts?.map((account) => (
                            <SelectItem key={account.id} value={`${account.id}|${account.name}`}>
                                {account.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              <p className="text-sm text-muted-foreground">Pilih nama akun yang sesuai dari daftar.</p>
              <FormMessage />
            </FormItem>
          )} />

          {/* ... FormField untuk logoUrl dan isActive tidak berubah ... */}
          <FormField control={form.control} name="logoUrl" render={({ field }) => ( <FormItem><FormLabel>URL Logo (Opsional)</FormLabel><FormControl><Input placeholder="https://..." {...field} /></FormControl><FormMessage /></FormItem> )} />
          <FormField control={form.control} name="isActive" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel>Aktif</FormLabel><p className="text-sm text-muted-foreground">Jika aktif, akan ditampilkan sebagai opsi pembayaran.</p></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem> )} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

// ... Sisa komponen PaymentMethodsPage tidak ada perubahan ...
export default function PaymentMethodsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | undefined>(undefined);
  const queryClient = useQueryClient();

  const { data: methods, isLoading } = useQuery({
    queryKey: ['paymentMethods'],
    queryFn: getAllPaymentMethods,
  });

  const deleteMutation = useMutation({
    mutationFn: deletePaymentMethod,
    onSuccess: () => {
      toast.success('Metode pembayaran berhasil dihapus.');
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal menghapus data.')
  });

  const handleOpenDialog = (method?: PaymentMethod) => {
    setEditingMethod(method);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setEditingMethod(undefined);
    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus metode pembayaran ini?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Metode Pembayaran Manual</h1>
        <Button onClick={() => handleOpenDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" /> Tambah Metode
        </Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Daftar Rekening Bank</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <Loader2 className="mx-auto animate-spin" /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Bank</TableHead><TableHead>Nomor Rekening</TableHead><TableHead>Pemilik</TableHead><TableHead>Akun Accurate</TableHead><TableHead>Status</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader>
              <TableBody>
                {methods?.map((method) => (
                  <TableRow key={method.id}>
                    <TableCell>{method.bankName}</TableCell>
                    <TableCell>{method.accountNumber}</TableCell>
                    <TableCell>{method.accountHolder}</TableCell>
                    <TableCell className="font-mono text-xs">{method.accurateBankName}</TableCell>
                    <TableCell>{method.isActive ? 'Aktif' : 'Tidak Aktif'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(method)}>Edit</Button>
                      <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(method.id)}>Hapus</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <PaymentMethodForm method={editingMethod} onClose={handleCloseDialog} />
        </DialogContent>
      </Dialog>
    </div>
  );
}