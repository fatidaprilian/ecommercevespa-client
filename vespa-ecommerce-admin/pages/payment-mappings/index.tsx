import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusCircle, Edit, Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAccurateBankAccounts, AccurateBankAccount } from '@/services/accurateService';
import api from '@/lib/api';

interface PaymentMapping {
  id: string;
  paymentMethodKey: string;
  accurateBankName: string;
  accurateBankId?: number; // Tambahkan untuk konsistensi
  description?: string;
}

const formSchema = z.object({
  paymentMethodKey: z.string().min(2, { message: 'Kunci metode harus diisi.' }),
  // ✅ PERUBAHAN 1: Field ini sekarang akan menyimpan "id|nama"
  accurateBankData: z.string().min(3, { message: 'Nama akun Accurate harus dipilih.' }),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const getMappings = async (): Promise<PaymentMapping[]> => {
  const { data } = await api.get('/payment-mappings');
  return data;
};
const createMapping = async (data: FormValues) => (await api.post('/payment-mappings', data)).data;
const updateMapping = async ({ id, data }: { id: string; data: FormValues }) => (await api.patch(`/payment-mappings/${id}`, data)).data;
const deleteMapping = async (id: string) => await api.delete(`/payment-mappings/${id}`);

function PaymentMappingForm({ mapping, onClose }: { mapping?: PaymentMapping; onClose: () => void; }) {
  const queryClient = useQueryClient();

  const { data: bankAccounts, isLoading: isLoadingBankAccounts } = useQuery<AccurateBankAccount[]>({
    queryKey: ['accurateBankAccounts'],
    queryFn: getAccurateBankAccounts,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    // ✅ PERUBAHAN 2: Inisialisasi nilai default
    defaultValues: {
      paymentMethodKey: mapping?.paymentMethodKey || '',
      accurateBankData: mapping ? `${mapping.accurateBankId}|${mapping.accurateBankName}` : '',
      description: mapping?.description || '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: any) => mapping ? updateMapping({ id: mapping.id, data }) : createMapping(data),
    onSuccess: () => {
      toast.success(`Pemetaan berhasil ${mapping ? 'diperbarui' : 'dibuat'}!`);
      queryClient.invalidateQueries({ queryKey: ['paymentMappings'] });
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal menyimpan data.'),
  });

  const onSubmit = (data: FormValues) => {
    // ✅ PERUBAHAN 3: Proses data sebelum dikirim ke API
    const [id, name] = data.accurateBankData.split('|');

    const payload = {
        ...data,
        accurateBankId: parseInt(id, 10),
        accurateBankName: name,
    };
    delete payload.accurateBankData;

    mutation.mutate(payload);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <DialogHeader><DialogTitle>{mapping ? 'Edit' : 'Tambah'} Pemetaan Pembayaran</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <FormField control={form.control} name="paymentMethodKey" render={({ field }) => ( <FormItem><FormLabel>Kunci Metode (dari Midtrans)</FormLabel><FormControl><Input placeholder="Contoh: bca_va, gopay" {...field} /></FormControl><FormMessage /></FormItem> )} />
          
          {/* ✅ PERUBAHAN 4: Update FormField untuk dropdown */}
          <FormField control={form.control} name="accurateBankData" render={({ field }) => (
            <FormItem>
              <FormLabel>Nama Akun Kas/Bank di Accurate</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingBankAccounts}>
                    <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder={isLoadingBankAccounts ? "Memuat..." : "Pilih akun Accurate"} />
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
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Deskripsi (Opsional)</FormLabel><FormControl><Input placeholder="Pembayaran via GoPay (Midtrans)" {...field} /></FormControl><FormMessage /></FormItem> )} />
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

// ... Sisa komponen PaymentMappingsPage tidak ada perubahan ...
export default function PaymentMappingsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<PaymentMapping | undefined>(undefined);
  const queryClient = useQueryClient();

  const { data: mappings, isLoading } = useQuery<PaymentMapping[]>({
    queryKey: ['paymentMappings'],
    queryFn: getMappings,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMapping,
    onSuccess: () => {
      toast.success('Pemetaan berhasil dihapus.');
      queryClient.invalidateQueries({ queryKey: ['paymentMappings'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal menghapus pemetaan.'),
  });

  const handleOpenDialog = (mapping?: PaymentMapping) => {
    setEditingMapping(mapping);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setEditingMapping(undefined);
    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus pemetaan ini?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pemetaan Pembayaran Midtrans</h1>
        <Button onClick={() => handleOpenDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" /> Tambah Pemetaan Baru
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Daftar Pemetaan</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="flex justify-center"><Loader2 className="animate-spin" /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kunci Metode</TableHead>
                  <TableHead>Nama Akun Accurate</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings?.map((mapping) => (
                  <TableRow key={mapping.id}>
                    <TableCell className="font-mono">{mapping.paymentMethodKey}</TableCell>
                    <TableCell>{mapping.accurateBankName}</TableCell>
                    <TableCell>{mapping.description}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(mapping)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(mapping.id)} disabled={deleteMutation.isPending}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
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
          <PaymentMappingForm mapping={editingMapping} onClose={handleCloseDialog} />
        </DialogContent>
      </Dialog>
    </div>
  );
}