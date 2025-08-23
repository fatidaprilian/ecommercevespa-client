// file: pages/payment-methods/index.tsx

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusCircle, Edit, Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion'; // 1. Impor motion dan AnimatePresence

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

// 2. Definisikan varian animasi
const pageVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { ease: 'easeOut', duration: 0.4 } },
};

const formSchema = z.object({
  bankName: z.string().min(2, { message: 'Nama bank harus diisi.' }),
  accountHolder: z.string().min(2, { message: 'Nama pemilik harus diisi.' }),
  accountNumber: z.string().min(5, { message: 'Nomor rekening tidak valid.' }),
  logoUrl: z.union([z.string().url({ message: "URL logo tidak valid." }), z.literal("")]).optional(),
  isActive: z.boolean().default(true),
  accurateBankData: z.string().min(3, { message: "Akun Accurate harus dipilih." }),
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
    defaultValues: {
      bankName: method?.bankName || '',
      accountHolder: method?.accountHolder || '',
      accountNumber: method?.accountNumber || '',
      logoUrl: method?.logoUrl || '',
      isActive: method?.isActive ?? true,
      accurateBankData: method && method.accurateBankNo ? `${method.accurateBankNo}|${method.accurateBankName}` : '',
    },
  });
  
  useEffect(() => {
    if (method) {
        form.reset({
            bankName: method.bankName,
            accountHolder: method.accountHolder,
            accountNumber: method.accountNumber,
            logoUrl: method.logoUrl || '',
            isActive: method.isActive,
            accurateBankData: method.accurateBankNo ? `${method.accurateBankNo}|${method.accurateBankName}` : '',
        });
    } else {
        form.reset({
            bankName: '',
            accountHolder: '',
            accountNumber: '',
            logoUrl: '',
            isActive: true,
            accurateBankData: '',
        });
    }
  }, [method, form]);

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
    const [no, name] = data.accurateBankData.split('|');
    
    const payload: any = {
        ...data,
        accurateBankNo: no,
        accurateBankName: name,
        accurateBankId: bankAccounts?.find(acc => acc.no === no)?.id,
    };

    // Note: This logic seems incorrect. 'isActive' should probably be part of the payload.
    // If you intend to send 'isActive', you should remove 'delete payload.isActive'.
    // However, I will keep it as is to not change your business logic.
    delete payload.isActive; 
    delete payload.accurateBankData;
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
          <FormField control={form.control} name="bankName" render={({ field }) => ( <FormItem><FormLabel>Nama Bank</FormLabel><FormControl><Input placeholder="Contoh: Bank Central Asia" {...field} /></FormControl><FormMessage /></FormItem> )} />
          <FormField control={form.control} name="accountNumber" render={({ field }) => ( <FormItem><FormLabel>Nomor Rekening</FormLabel><FormControl><Input placeholder="1234567890" {...field} /></FormControl><FormMessage /></FormItem> )} />
          <FormField control={form.control} name="accountHolder" render={({ field }) => ( <FormItem><FormLabel>Nama Pemilik Rekening</FormLabel><FormControl><Input placeholder="PT Vespa Part" {...field} /></FormControl><FormMessage /></FormItem> )} />

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
                            <SelectItem key={account.id} value={`${account.no}|${account.name}`}>
                                {account.name} <span className="text-muted-foreground ml-2">({account.no})</span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              <p className="text-sm text-muted-foreground">Pilih nama akun yang sesuai dari daftar.</p>
              <FormMessage />
            </FormItem>
          )} />
          
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
    // 3. Bungkus seluruh halaman dengan motion.div
    <motion.div className="space-y-6" initial="hidden" animate="visible" variants={pageVariants}>
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Metode Pembayaran Manual</h1>
        <Button onClick={() => handleOpenDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" /> Tambah Metode
        </Button>
      </motion.div>
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader><CardTitle>Daftar Rekening Bank</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <div className="flex justify-center"><Loader2 className="animate-spin" /></div> : (
              <Table>
                <TableHeader><TableRow><TableHead>Bank</TableHead><TableHead>Nomor Rekening</TableHead><TableHead>Pemilik</TableHead><TableHead>Akun Accurate</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
                {/* 4. Gunakan AnimatePresence dan motion.tbody */}
                <AnimatePresence>
                    <motion.tbody
                        initial="hidden"
                        animate="visible"
                        variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
                    >
                        {methods?.map((method) => (
                        <motion.tr key={method.id} variants={itemVariants}>
                            <TableCell>{method.bankName}</TableCell>
                            <TableCell>{method.accountNumber}</TableCell>
                            <TableCell>{method.accountHolder}</TableCell>
                            <TableCell className="font-mono text-xs">{method.accurateBankName}</TableCell>
                            <TableCell>{method.isActive ? 'Aktif' : 'Tidak Aktif'}</TableCell>
                            <TableCell className="text-right space-x-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(method)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(method.id)} disabled={deleteMutation.isPending}>
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                            </TableCell>
                        </motion.tr>
                        ))}
                    </motion.tbody>
                </AnimatePresence>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <PaymentMethodForm method={editingMethod} onClose={handleCloseDialog} />
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}