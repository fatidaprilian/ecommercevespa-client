// file: pages/settings/index.tsx

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Loader2, Edit, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';

import { getProvinces, getCities, getDistricts, LocationData } from '../services/shippingService';
import { getAllSettings, updateSetting, updateMultipleSettings, SettingPayload, AppSetting } from '../services/settingsService';

// --- TIPE DATA ---
type OriginFormValues = {
  provinceId: string;
  cityId: string;
  districtId: string;
};

type WarehouseAddressFormValues = {
    WAREHOUSE_PIC_NAME: string;
    WAREHOUSE_PHONE: string;
    WAREHOUSE_FULL_ADDRESS: string;
};

// --- Komponen Form Alamat Gudang (dengan Mode Edit) ---
function WarehouseAddressForm({ allSettings, isLoading }: { allSettings: AppSetting[] | undefined, isLoading: boolean }) {
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const warehouseForm = useForm<WarehouseAddressFormValues>();

    const settingsMap = new Map(allSettings?.map(s => [s.key, s.value]));
    const hasExistingAddress = !!settingsMap.get('WAREHOUSE_FULL_ADDRESS');

    useEffect(() => {
        if (allSettings) {
            // Isi form dengan data dari query saat komponen dimuat
            warehouseForm.reset({
                WAREHOUSE_PIC_NAME: settingsMap.get('WAREHOUSE_PIC_NAME') || '',
                WAREHOUSE_PHONE: settingsMap.get('WAREHOUSE_PHONE') || '',
                WAREHOUSE_FULL_ADDRESS: settingsMap.get('WAREHOUSE_FULL_ADDRESS') || '',
            });
            // Jika belum ada alamat, langsung masuk mode edit
            if (!hasExistingAddress) {
                setIsEditing(true);
            }
        }
    }, [allSettings, warehouseForm, hasExistingAddress]);

    const warehouseMutation = useMutation({
        mutationFn: (payload: SettingPayload[]) => updateMultipleSettings(payload),
        onSuccess: () => {
            toast.success('Alamat gudang berhasil diperbarui!');
            setIsEditing(false); // Keluar dari mode edit setelah berhasil
            queryClient.invalidateQueries({ queryKey: ['settings'] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Gagal menyimpan alamat gudang.');
        }
    });

    const onWarehouseSubmit = (data: WarehouseAddressFormValues) => {
        const payload: SettingPayload[] = Object.entries(data).map(([key, value]) => ({ key, value }));
        warehouseMutation.mutate(payload);
    };
    
    const handleCancel = () => {
        // Reset form ke nilai awal dari server dan keluar mode edit
        warehouseForm.reset();
        setIsEditing(false);
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Alamat Gudang / Pickup</CardTitle>
                    <CardDescription>Informasi ini akan digunakan saat melakukan permintaan pickup kurir.</CardDescription>
                </div>
                {!isEditing && hasExistingAddress && (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                        <Edit className="mr-2 h-4 w-4"/> Edit Alamat
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                {isLoading ? (
                     <div className="flex items-center text-muted-foreground">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat data alamat...
                    </div>
                ) : isEditing ? (
                    <Form {...warehouseForm}>
                        <form onSubmit={warehouseForm.handleSubmit(onWarehouseSubmit)} className="space-y-4">
                             <FormField control={warehouseForm.control} name="WAREHOUSE_PIC_NAME" render={({ field }) => (
                                <FormItem><FormLabel>Nama Penanggung Jawab (PIC)</FormLabel><FormControl><Input placeholder="Contoh: Budi Santoso" {...field} /></FormControl></FormItem>
                            )}/>
                             <FormField control={warehouseForm.control} name="WAREHOUSE_PHONE" render={({ field }) => (
                                <FormItem><FormLabel>Nomor Telepon PIC</FormLabel><FormControl><Input placeholder="Contoh: 081234567890" {...field} /></FormControl></FormItem>
                            )}/>
                             <FormField control={warehouseForm.control} name="WAREHOUSE_FULL_ADDRESS" render={({ field }) => (
                                <FormItem><FormLabel>Alamat Lengkap Gudang</FormLabel><FormControl><Textarea placeholder="Jl. Raya Vespa No. 123, RT 01/RW 02, Kelurahan Cirimekar..." {...field} /></FormControl></FormItem>
                            )}/>
                             <div className="flex justify-end gap-2 pt-4">
                                {hasExistingAddress && <Button type="button" variant="ghost" onClick={handleCancel}>Batal</Button>}
                                <Button type="submit" disabled={warehouseMutation.isPending}>
                                    {warehouseMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Simpan Alamat
                                </Button>
                            </div>
                        </form>
                    </Form>
                ) : (
                    <div className="space-y-3 text-sm text-muted-foreground">
                        <p><strong>Nama PIC:</strong> {settingsMap.get('WAREHOUSE_PIC_NAME') || '-'}</p>
                        <p><strong>Telepon:</strong> {settingsMap.get('WAREHOUSE_PHONE') || '-'}</p>
                        <p><strong>Alamat:</strong> {settingsMap.get('WAREHOUSE_FULL_ADDRESS') || '-'}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// --- Komponen Halaman Utama ---
export default function SettingsPage() {
  const queryClient = useQueryClient();
  const originForm = useForm<OriginFormValues>({
    defaultValues: { provinceId: '', cityId: '', districtId: '' },
  });

  const selectedProvince = originForm.watch('provinceId');
  const selectedCity = originForm.watch('cityId');

  // HANYA SATU QUERY UNTUK SEMUA PENGATURAN
  const { data: allSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: getAllSettings,
    refetchOnWindowFocus: false,
  });

  const currentOrigin = allSettings?.find(s => s.key === 'RAJAONGKIR_ORIGIN_DISTRICT_ID');

  const { data: provinces, isLoading: isLoadingProvinces } = useQuery<LocationData[]>({ queryKey: ['provinces'], queryFn: getProvinces });
  const { data: cities, isLoading: isLoadingCities } = useQuery<LocationData[]>({ queryKey: ['cities', selectedProvince], queryFn: () => getCities(selectedProvince!), enabled: !!selectedProvince });
  const { data: districts, isLoading: isLoadingDistricts } = useQuery<LocationData[]>({ queryKey: ['districts', selectedCity], queryFn: () => getDistricts(selectedCity!), enabled: !!selectedCity });

  const originMutation = useMutation({
    mutationFn: (newDistrictId: string) => updateSetting({
      key: 'RAJAONGKIR_ORIGIN_DISTRICT_ID',
      value: newDistrictId,
      description: 'ID Kecamatan asal pengiriman untuk perhitungan ongkos kirim RajaOngkir.',
    }),
    onSuccess: () => {
      toast.success('Lokasi asal pengiriman berhasil diperbarui!');
      // Invalidate query utama agar semua komponen di halaman ini mendapat data baru
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menyimpan pengaturan.');
    },
  });

  const onOriginSubmit = (data: OriginFormValues) => {
    if (data.districtId) {
      originMutation.mutate(data.districtId);
    } else {
      toast.error('Harap lengkapi pilihan sampai tingkat Kecamatan.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pengaturan Aplikasi</h1>
        <p className="text-muted-foreground">Kelola konfigurasi global untuk toko online dan panel admin Anda.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Asal Pengiriman (RajaOngkir)</CardTitle>
          <CardDescription>Pilih lokasi gudang untuk perhitungan ongkos kirim.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingSettings ? (
            <div className="flex items-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat...</div>
          ) : (
            <p className="text-sm text-muted-foreground mb-4">
              ID Kecamatan saat ini:{' '}
              <span className="font-mono bg-secondary px-2 py-1 rounded-md">{currentOrigin?.value || 'Belum diatur'}</span>
            </p>
          )}

          <Form {...originForm}>
            <form onSubmit={originForm.handleSubmit(onOriginSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={originForm.control} name="provinceId" render={({ field }) => (
                  <FormItem><FormLabel>Provinsi</FormLabel>
                    <Select onValueChange={(value) => { field.onChange(value); originForm.setValue('cityId', ''); originForm.setValue('districtId', ''); }} value={field.value || ''} disabled={isLoadingProvinces}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Pilih provinsi..." /></SelectTrigger></FormControl>
                      <SelectContent>{provinces?.map((p) => (<SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>))}</SelectContent>
                    </Select>
                  </FormItem>
                )}/>
                <FormField control={originForm.control} name="cityId" render={({ field }) => (
                  <FormItem><FormLabel>Kota/Kabupaten</FormLabel>
                    <Select onValueChange={(value) => { field.onChange(value); originForm.setValue('districtId', ''); }} value={field.value || ''} disabled={!selectedProvince || isLoadingCities}>
                      <FormControl><SelectTrigger><SelectValue placeholder={isLoadingCities ? 'Memuat...' : 'Pilih kota...'} /></SelectTrigger></FormControl>
                      <SelectContent>{cities?.map((c) => (<SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>))}</SelectContent>
                    </Select>
                  </FormItem>
                )}/>
                <FormField control={originForm.control} name="districtId" render={({ field }) => (
                  <FormItem><FormLabel>Kecamatan</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''} disabled={!selectedCity || isLoadingDistricts}>
                      <FormControl><SelectTrigger><SelectValue placeholder={isLoadingDistricts ? 'Memuat...' : 'Pilih kecamatan...'} /></SelectTrigger></FormControl>
                      <SelectContent>{districts?.map((d) => (<SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>))}</SelectContent>
                    </Select>
                  </FormItem>
                )}/>
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={originMutation.isPending}><Save className="mr-2 h-4 w-4"/> Simpan Lokasi Origin</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <WarehouseAddressForm allSettings={allSettings} isLoading={isLoadingSettings} />
    </div>
  );
}