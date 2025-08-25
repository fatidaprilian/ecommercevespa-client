'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { MapPin, Plus, Home, Trash2, Edit, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getAddresses, deleteAddress, Address } from '@/services/addressService';
import toast from 'react-hot-toast';
import { Dialog } from "@/components/ui/dialog";
import { AddressDialog } from '../../_components/AddressDialog';

export default function AlamatPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  const { data: addresses, isLoading } = useQuery<Address[], Error>({
    queryKey: ['my-addresses'],
    queryFn: getAddresses,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAddress,
    onSuccess: () => {
        toast.success("Alamat berhasil dihapus.");
        queryClient.invalidateQueries({ queryKey: ['my-addresses'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal menghapus.'),
  });

  const handleDelete = (id: string) => {
    if (window.confirm("Anda yakin ingin menghapus alamat ini?")) {
        deleteMutation.mutate(id);
    }
  };

  const handleAddNew = () => {
    setSelectedAddress(null);
    setIsModalOpen(true);
  };

  const handleEdit = (address: Address) => {
    setSelectedAddress(address);
    setIsModalOpen(true);
  }

  const handleSave = () => {
    setIsModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ['my-addresses'] });
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Daftar Alamat</h2>
            <p className="text-gray-500">Kelola alamat pengiriman Anda.</p>
          </div>
          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" /> Tambah Alamat Baru
          </Button>
        </div>

        {isLoading && (
          <div className="text-center p-8"><Loader2 className="animate-spin mx-auto h-8 w-8 text-gray-400"/></div>
        )}

        {!isLoading && addresses?.length === 0 && (
            <div className="text-center py-16 border-2 border-dashed rounded-lg">
                <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-4"/>
                <h3 className="text-xl font-semibold text-gray-700">Anda belum memiliki alamat.</h3>
                <p className="text-gray-500 mt-2">Tambahkan alamat baru untuk memulai.</p>
            </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {addresses?.map(address => (
            <Card key={address.id} className="relative group">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="text-gray-600"/> Alamat
                  {address.isDefault && (
                    <span className="flex items-center text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      <Home className="h-3 w-3 mr-1"/> Utama
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold text-gray-800">{address.street}</p>
                <p className="text-gray-600">{address.district}, {address.city}</p>
                <p className="text-gray-600">{address.province}, {address.postalCode}</p>
              </CardContent>
              <div className="absolute top-4 right-4 flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => handleEdit(address)}><Edit className="h-4 w-4"/></Button>
                  <Button variant="destructive" size="icon" onClick={() => handleDelete(address.id)} disabled={deleteMutation.isPending && deleteMutation.variables === address.id}>
                      {(deleteMutation.isPending && deleteMutation.variables === address.id) ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4"/>}
                  </Button>
              </div>
            </Card>
          ))}
        </div>
      </motion.div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <AddressDialog 
          initialData={selectedAddress}
          onSave={handleSave}
          onClose={() => setIsModalOpen(false)}
        />
      </Dialog>
    </>
  );
}