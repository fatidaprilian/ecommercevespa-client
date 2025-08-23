// file: pages/payment-mappings/index.tsx

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusCircle, Edit, Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/button';
// 👇 --- PERBAIKAN DI SINI --- 👇
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
// 👆 --- AKHIR PERBAIKAN --- 👆
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAccurateBankAccounts, AccurateBankAccount } from '@/services/accurateService';
import api from '@/lib/api';

// Varian animasi
const pageVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { ease: 'easeOut', duration: 0.4 } },
};

interface PaymentMapping {
  id: string;
  paymentMethodKey: string;
  accurateBankName: string;
  accurateBankId?: number;
  accurateBankNo?: string;
  description?: string;
}

const formSchema = z.object({
  paymentMethodKey: z.string().min(2, { message: 'Kunci metode harus diisi.' }),
  accurateBankData: z.string().min(3, { message: 'Akun Accurate harus dipilih.' }),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const getMappings = async (): Promise<PaymentMapping[]> => {
  const { data } = await api.get('/payment-mappings');
  return data;
};
const createMapping = async (data: any) => (await api.post('/payment-mappings', data)).data;
const updateMapping = async ({ id, data }: { id: string; data: any }) => (await api.patch(`/payment-mappings/${id}`, data)).data;
const deleteMapping = async (id: string) => await api.delete(`/payment-mappings/${id}`);

function PaymentMappingForm({ mapping, onClose }: { mapping?: PaymentMapping; onClose: () => void; }) {
  const queryClient = useQueryClient();

  const { data: bankAccounts, isLoading: isLoadingBankAccounts } = useQuery<AccurateBankAccount[]>({
    queryKey: ['accurateBankAccounts'],
    queryFn: getAccurateBankAccounts,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      paymentMethodKey: mapping?.paymentMethodKey || '',
      accurateBankData: mapping && mapping.accurateBankNo ? `${mapping.accurateBankNo}|${mapping.accurateBankName}` : '',
      description: mapping?.description || '',
    },
  });
  
  useEffect(() => {
      if (mapping) {
          form.reset({
              paymentMethodKey: mapping.paymentMethodKey,
              accurateBankData: mapping.accurateBankNo ? `${mapping.accurateBankNo}|${mapping.accurateBankName}` : '',
              description: mapping.description || '',
          });
      } else {
          form.reset({
              paymentMethodKey: '',
              accurateBankData: '',
              description: '',
          });
      }
  }, [mapping, form]);

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
    const [no, name] = data.accurateBankData.split('|');
    const payload = {
        ...data,
        accurateBankNo: no,
        accurateBankName: name,
        accurateBankId: bankAccounts?.find(acc => acc.no === no)?.id,
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
                            <SelectItem key={account.id} value={`${account.no}|${account.name}`}>
                                {account.name} <span className="text-muted-foreground ml-2">({account.no})</span>
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
    <motion.div className="space-y-6" initial="hidden" animate="visible" variants={pageVariants}>
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Pemetaan Pembayaran</h1>
        <Button onClick={() => handleOpenDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" /> Tambah Pemetaan Baru
        </Button>
      </motion.div>
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Daftar Pemetaan</CardTitle>
            <CardDescription>Hubungkan metode pembayaran dari Midtrans ke akun Kas & Bank di Accurate.</CardDescription>
          </CardHeader>
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
                <AnimatePresence>
                    <motion.tbody
                        initial="hidden"
                        animate="visible"
                        variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
                    >
                        {mappings?.map((mapping) => (
                        <motion.tr key={mapping.id} variants={itemVariants}>
                            <TableCell className="font-mono">{mapping.paymentMethodKey}</TableCell>
                            <TableCell>{mapping.accurateBankName}</TableCell>
                            <TableCell>{mapping.description}</TableCell>
                            <TableCell className="text-right space-x-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(mapping)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(mapping.id)} disabled={deleteMutation.isPending}>
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
          <PaymentMappingForm mapping={editingMapping} onClose={handleCloseDialog} />
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}