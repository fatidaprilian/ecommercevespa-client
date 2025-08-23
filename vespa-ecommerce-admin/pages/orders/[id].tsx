// file: pages/orders/[id].tsx (Revisi Lengkap & Final)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2, User, Package, MapPin, Truck, CheckCircle, ChevronsRight, Landmark, Copy } from 'lucide-react';

import { getOrderById, Order, OrderItem, OrderStatus } from '@/services/orderService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api from '@/lib/api';
// [DIPERBAIKI] Impor ini sekarang akan berfungsi dengan benar
import { getTrackingDetails, TrackingDetails } from '@/services/shippingService';

// --- Helper Functions ---
const formatDate = (dateString: string) => new Date(dateString).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
const formatPrice = (price: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} disalin!`);
};

// --- Service Functions ---
const updateOrderStatus = async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
    const { data } = await api.patch(`/orders/${orderId}/status`, { status });
    return data;
};

const createShipment = async ({ orderId, courier_company, courier_type }: { orderId: string; courier_company: string; courier_type: string }) => {
    const { data } = await api.post(`/shipments/order/${orderId}`, { courier_company, courier_type });
    return data;
};

// Komponen untuk menampilkan detail pelacakan (ShipmentTracking)
function ShipmentTracking({ order }: { order: Order }) {
    if (!order.shipment?.trackingNumber || !order.courier) {
        return null;
    }

    const courierCode = order.courier.split(' - ')[0].trim().toLowerCase();
    const waybillId = order.shipment.trackingNumber;

    const { data: trackingInfo, isLoading, isError } = useQuery<TrackingDetails>({
        queryKey: ['tracking', waybillId, courierCode],
        queryFn: () => getTrackingDetails(waybillId, courierCode),
        enabled: !!waybillId && !!courierCode,
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Truck size={20}/> Informasi Pengiriman</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <p className="text-sm text-muted-foreground">Kurir</p>
                    <p className="font-semibold">{order.courier}</p>
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">Nomor Resi</p>
                    <div className="flex items-center gap-2">
                        <p className="font-mono font-semibold">{waybillId}</p>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(waybillId, 'Nomor resi')}>
                            <Copy className="h-4 w-4"/>
                        </Button>
                    </div>
                </div>
                
                <div className="border-t pt-4">
                    <h3 className="font-semibold text-md text-gray-700 mb-2">Riwayat Perjalanan:</h3>
                    {isLoading && <div className="flex items-center gap-2 text-gray-500 py-2"><Loader2 className="animate-spin h-4 w-4"/> Memuat riwayat...</div>}
                    {isError && <p className="text-red-500 text-sm py-2">Gagal memuat riwayat pelacakan.</p>}

                    {trackingInfo && (
                        <div className="space-y-4">
                            {trackingInfo.history.map((item, index) => {
                                const isLatestStatus = index === trackingInfo.history.length - 1;
                                return (
                                    <div key={index} className="flex items-start gap-4">
                                        <div className="flex flex-col items-center mt-1">
                                            <div className={`h-4 w-4 rounded-full flex items-center justify-center ${isLatestStatus ? 'bg-primary' : 'bg-gray-300'}`}>
                                                {isLatestStatus && <div className="h-2 w-2 bg-white rounded-full"></div>}
                                            </div>
                                            {index < trackingInfo.history.length - 1 && <div className="w-0.5 h-12 bg-gray-300"></div>}
                                        </div>
                                        <div>
                                            <p className={`font-semibold ${isLatestStatus ? 'text-primary' : 'text-gray-800'}`}>{item.note}</p>
                                            {/* [PERBAIKAN] Menggunakan item.eventDate yang benar sesuai payload API */}
                                            <p className="text-xs text-muted-foreground">{formatDate(item.eventDate)}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export default function OrderDetailPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = router.query;
  const orderId = typeof id === 'string' ? id : '';
  
  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrderById(orderId),
    enabled: !!orderId,
  });

  const statusMutation = useMutation({
    mutationFn: updateOrderStatus,
    onSuccess: (data) => {
        toast.success(`Status pesanan berhasil diubah menjadi "${data.status}"!`);
        queryClient.invalidateQueries({ queryKey: ['order', orderId] });
        queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal mengubah status pesanan.')
  });

  const shipmentMutation = useMutation({
    mutationFn: createShipment,
    onSuccess: () => {
        toast.success('Pengiriman berhasil dibuat dan status pesanan diperbarui!');
        queryClient.invalidateQueries({ queryKey: ['order', orderId] });
        queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal memproses pengiriman.')
  });

  const handleValidatePayment = () => {
      if(window.confirm('Konfirmasi bahwa Anda telah menerima pembayaran untuk pesanan ini? Status akan diubah menjadi PROCESSING.')) {
          statusMutation.mutate({
              orderId,
              status: OrderStatus.PROCESSING,
          });
      }
  };

  const handleCreateShipment = () => {
    if (!order || !order.courier) {
        toast.error('Informasi kurir tidak ditemukan pada pesanan ini.');
        return;
    }
    const parts = order.courier.split(' - ');
    if (parts.length < 2) {
        toast.error(`Format kurir tidak valid: ${order.courier}`);
        return;
    }
    const courier_company = parts[0].trim().toLowerCase();
    const courier_type = parts[1].trim().toLowerCase();
    shipmentMutation.mutate({ orderId, courier_company, courier_type });
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  if (isError) return <p className="text-center text-red-500 p-8">Gagal memuat detail pesanan.</p>;
  if (!order) return null;

  const total = order.totalAmount;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" asChild>
          <Link href="/orders"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Daftar Pesanan</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                  <CardTitle>Detail Pesanan #{order.orderNumber}</CardTitle>
                  <CardDescription>Tanggal: {formatDate(order.createdAt)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Produk</TableHead><TableHead>SKU</TableHead><TableHead className="text-center">Jumlah</TableHead><TableHead className="text-right">Harga Satuan</TableHead><TableHead className="text-right">Subtotal</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {order.items.map((item: OrderItem) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.product.name}</TableCell>
                          <TableCell>{item.product.sku}</TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatPrice(item.price)}</TableCell>
                          <TableCell className="text-right">{formatPrice(item.price * item.quantity)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow><TableCell colSpan={4} className="text-right">Subtotal</TableCell><TableCell className="text-right">{formatPrice(order.subtotal)}</TableCell></TableRow>
                      <TableRow><TableCell colSpan={4} className="text-right">Diskon</TableCell><TableCell className="text-right">- {formatPrice(order.discountAmount)}</TableCell></TableRow>
                      <TableRow><TableCell colSpan={4} className="text-right">PPN</TableCell><TableCell className="text-right">{formatPrice(order.taxAmount)}</TableCell></TableRow>
                      <TableRow><TableCell colSpan={4} className="text-right">Ongkos Kirim ({order.courier})</TableCell><TableCell className="text-right">{formatPrice(order.shippingCost)}</TableCell></TableRow>
                      <TableRow className="font-extrabold text-lg bg-secondary"><TableCell colSpan={4} className="text-right">Total Pembayaran</TableCell><TableCell className="text-right">{formatPrice(total)}</TableCell></TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
            </Card>

            {(order.status === 'SHIPPED' || order.status === 'DELIVERED' || order.status === 'COMPLETED') && (
                <ShipmentTracking order={order} />
            )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5"/> Pelanggan</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="font-semibold">{order.user.name}</p>
              <p className="text-muted-foreground">{order.user.email}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5"/> Alamat Pengiriman</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">{order.shippingAddress}</CardContent>
          </Card>
          
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5"/> Status & Tindakan</CardTitle></CardHeader>
            <CardContent>
               <div className="mb-4">
                  <p className="text-sm text-muted-foreground">Status Pesanan</p>
                  <span className={`px-2 py-1 text-sm font-bold rounded-full ${ order.status === 'PAID' ? 'bg-green-100 text-green-800' : order.status === 'PROCESSING' ? 'bg-orange-100 text-orange-800' : order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-800' : order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800' }`}>
                      {order.status}
                  </span>
               </div>
               
               {order.status === 'PENDING' && order.payment?.proofOfPayment && (
                 <div className="border-t pt-4 space-y-4">
                    <p className="text-sm font-semibold">Bukti Pembayaran Reseller:</p>
                    <a href={order.payment.proofOfPayment} target="_blank" rel="noopener noreferrer">
                        <img src={order.payment.proofOfPayment} alt="Bukti Pembayaran" className="rounded-lg border hover:opacity-80 transition-opacity"/>
                    </a>
                    
                    {order.payment.manualPaymentMethod ? (
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-3 text-sm">
                            <p className="font-semibold text-blue-800">Reseller melakukan transfer ke:</p>
                            <div className="flex items-center gap-2 mt-1 text-blue-700">
                                <Landmark className="h-4 w-4" />
                                <span>{order.payment.manualPaymentMethod.bankName} - {order.payment.manualPaymentMethod.accountNumber}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-yellow-50 p-3 rounded-md text-sm text-yellow-800">
                          <p>Informasi bank tujuan tidak tercatat.</p>
                        </div>
                    )}

                    <Button onClick={handleValidatePayment} className="w-full bg-green-600 hover:bg-green-700" disabled={statusMutation.isPending}>
                        {statusMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        <CheckCircle className="mr-2 h-4 w-4" /> Validasi & Proses Pesanan
                    </Button>
                 </div>
               )}

               {order.status === 'PAID' && (
                 <div className="border-t pt-4 space-y-2">
                    <p className="text-sm text-muted-foreground">Pembayaran Midtrans berhasil, pesanan siap diproses.</p>
                    <Button onClick={handleValidatePayment} className="w-full" disabled={statusMutation.isPending}>
                        {statusMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Proses Pesanan <ChevronsRight className="ml-2 h-4 w-4"/>
                    </Button>
                 </div>
               )}

               {order.status === 'PROCESSING' && (
                  <div className="space-y-4 border-t pt-4">
                    <div className="text-sm">
                      <p className="text-muted-foreground">Kurir Pilihan Pelanggan:</p>
                      <p className="font-semibold text-base">{order.courier}</p>
                    </div>
                     <Button onClick={handleCreateShipment} className="w-full" disabled={shipmentMutation.isPending}>
                        {shipmentMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Truck className="mr-2 h-4 w-4"/>}
                        Buat Pengiriman & Dapatkan Resi
                     </Button>
                  </div>
                )}

               {order.status === 'SHIPPED' && order.shipment && (
                 <div className="space-y-2 text-sm border-t pt-4">
                    <p className="font-semibold">Informasi Pengiriman:</p>
                    <p><span className="text-muted-foreground">Kurir:</span> {order.shipment.courier}</p>
                    <p><span className="text-muted-foreground">No. Resi:</span> <span className="font-mono">{order.shipment.trackingNumber}</span></p>
                    <p><span className="text-muted-foreground">Dikirim pada:</span> {formatDate(order.shipment.createdAt)}</p>
                 </div>
               )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}