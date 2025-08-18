// file: vespa-ecommerce-admin/pages/orders/index.tsx

import { useState, useMemo } from 'react'; // <-- Import useState & useMemo
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Eye, Search } from 'lucide-react'; // <-- Import Search

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input'; // <-- Import Input
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { getOrders, Order } from '@/services/orderService';


const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
};

export default function OrdersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: orders, isLoading, isError, error } = useQuery<Order[], Error>({
    queryKey: ['orders'],
    queryFn: getOrders,
  });

  // Logika untuk memfilter pesanan
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (!searchTerm) return orders;

    const lowercasedTerm = searchTerm.toLowerCase();
    return orders.filter(order =>
      order.orderNumber.toLowerCase().includes(lowercasedTerm) ||
      order.user.name.toLowerCase().includes(lowercasedTerm) ||
      order.user.email.toLowerCase().includes(lowercasedTerm)
    );
  }, [orders, searchTerm]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Pesanan</h1>
          <p className="text-muted-foreground">
            Lihat dan kelola semua pesanan yang masuk.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>Daftar Pesanan</CardTitle>
                    <CardDescription>
                        Menampilkan {filteredOrders.length} dari {orders?.length || 0} pesanan ditemukan.
                    </CardDescription>
                </div>
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari No. Order, Nama, atau Email..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-center h-24">Memuat data...</TableCell></TableRow>}
              {isError && <TableRow><TableCell colSpan={6} className="text-center h-24 text-red-500">Gagal memuat data: {error.message}</TableCell></TableRow>}
              
              {filteredOrders && filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">{order.orderNumber}</TableCell>
                    <TableCell>{formatDate(order.createdAt)}</TableCell>
                    <TableCell className="font-medium">{order.user.name}</TableCell>
                    <TableCell>{formatPrice(order.totalAmount + order.shippingCost)}</TableCell>
                    <TableCell>
                       <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          order.status === 'PAID' ? 'bg-green-100 text-green-800' :
                          order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                           order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status}
                        </span>
                    </TableCell>
                    <TableCell className="text-right">
                       <Button variant="outline" size="sm" asChild>
                           <Link href={`/orders/${order.id}`}> 
                               <Eye className="mr-2 h-4 w-4" /> Lihat
                           </Link>
                       </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                !isLoading && <TableRow><TableCell colSpan={6} className="text-center h-24">Pesanan tidak ditemukan.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}