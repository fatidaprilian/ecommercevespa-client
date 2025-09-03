// file: vespa-ecommerce-admin/pages/orders/edit-status.tsx

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

import { getOrderById, updateOrderStatus, Order, OrderStatus } from '@/services/orderService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const statusOptions = [
  OrderStatus.PENDING,
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
  OrderStatus.COMPLETED,
  OrderStatus.CANCELLED,
  OrderStatus.REFUNDED,
];

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
};

const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
};

export default function EditOrderStatusPage() {
  const router = useRouter();
  const { id } = router.query;
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  const { data: order, isLoading, isError } = useQuery<Order, Error>({
    queryKey: ['order', id],
    queryFn: () => getOrderById(id as string),
    enabled: !!id, // Hanya jalankan query jika ID ada
  });

  useEffect(() => {
    if (order) {
      setSelectedStatus(order.status);
    }
  }, [order]);
  
  const mutation = useMutation({
    mutationFn: (newStatus: string) => updateOrderStatus(id as string, newStatus),
    onSuccess: () => {
      toast.success('Status pesanan berhasil diperbarui!');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      router.push(`/orders/${id}`); // Kembali ke halaman detail setelah sukses
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal memperbarui status.');
    },
  });

  const handleSubmit = () => {
    if (!selectedStatus || selectedStatus === order?.status) {
        // Jika tidak ada perubahan, langsung kembali
        router.push(`/orders/${id}`);
        return;
    }
    mutation.mutate(selectedStatus);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !order) {
    return <div className="text-center text-red-500">Gagal memuat data pesanan.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Ubah Status Pesanan</h1>
            <p className="text-muted-foreground">
                Mengubah status untuk pesanan #{order.orderNumber}
            </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detail Pesanan</CardTitle>
          <CardDescription>
            Dibuat pada {formatDate(order.createdAt)} oleh {order.user.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
                <span>Status Saat Ini:</span>
                <span className="font-semibold">{order.status}</span>
            </div>
            <div className="flex justify-between items-center">
                <span>Total Pembayaran:</span>
                <span className="font-semibold">{formatPrice(order.totalAmount)}</span>
            </div>
             <div className="space-y-2 pt-4">
                <Label htmlFor="status" className="text-base font-semibold">Pilih Status Baru</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Pilih status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push(`/orders/${id}`)}>
            Batal
        </Button>
        <Button onClick={handleSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Simpan Perubahan
        </Button>
      </div>
    </div>
  );
}