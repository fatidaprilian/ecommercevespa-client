import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Loader2, Edit, Save, Check, ChevronsUpDown } from 'lucide-react';
import axios from 'axios';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel as RHFormLabel } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';

import { searchAreas, LocationData } from '@/services/shippingService';
// Import fungsi baru untuk PPN
import {
  getAllSettings,
  updateMultipleSettings,
  SettingPayload,
  AppSetting,
  getVatSetting,
  updateVatSetting
} from '@/services/settingsService';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


// ====================================================================
// KOMPONEN BARU: PENGATURAN PPN (VAT)
// ====================================================================
const VatSettings = () => {
  const [vatValue, setVatValue] = useState('');
  const queryClient = useQueryClient();

  // Query untuk mengambil data PPN
  const { data: vatData, isLoading: isLoadingVat } = useQuery({
    queryKey: ['vatSetting'],
    queryFn: getVatSetting,
    onSuccess: (data) => {
      if (data && data.value) {
        setVatValue(data.value.toString());
      }
    },
  });

  // Mutasi untuk memperbarui data PPN
  const mutation = useMutation({
    mutationFn: (newValue: number) => updateVatSetting(newValue),
    onSuccess: () => {
      toast.success('Pengaturan PPN berhasil disimpan!');
      // Invalidate query agar data terbaru diambil kembali
      queryClient.invalidateQueries({ queryKey: ['vatSetting'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal menyimpan pengaturan PPN.');
    },
  });

  const handleSave = () => {
    const numericValue = parseFloat(vatValue);
    if (isNaN(numericValue)) {
      toast.error('Nilai PPN harus berupa angka.');
      return;
    }
    mutation.mutate(numericValue);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pengaturan Pajak</CardTitle>
        <CardDescription>
          Atur persentase Pajak Pertambahan Nilai (PPN) yang berlaku untuk semua transaksi.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-4">
          <div className="flex-1 space-y-2">
            <Label htmlFor="ppn">Persentase PPN (%)</Label>
            {isLoadingVat ? (
               <div className="flex items-center text-muted-foreground text-sm">
                 <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat...
               </div>
            ) : (
              <Input
                id="ppn"
                type="number"
                value={vatValue}
                onChange={(e) => setVatValue(e.target.value)}
                placeholder="Contoh: 11"
                step="0.1"
              />
            )}
          </div>
          <Button onClick={handleSave} disabled={mutation.isPending || isLoadingVat}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan PPN
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};


// ====================================================================
// KOMPONEN: ACCURATE INTEGRATION (TIDAK DIUBAH)
// ====================================================================
const AccurateIntegration = () => {
    const [status, setStatus] = useState<{ connected: boolean; dbSelected: boolean }>({ connected: false, dbSelected: false });
    const [isLoading, setIsLoading] = useState(true);
    const [databases, setDatabases] = useState<{ id: string; alias: string }[]>([]);
    const [selectedDb, setSelectedDb] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const api = axios.create({
        baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
        withCredentials: true,
    });

    useEffect(() => {
        const handleUrlParams = () => {
            const urlParams = new URLSearchParams(window.location.search);
            const successParam = urlParams.get('success');
            const errorParam = urlParams.get('error');

            if (successParam) {
                toast.success('Berhasil terhubung dengan Akun Accurate!');
            }
            if (errorParam) {
                toast.error(`Gagal terhubung: ${decodeURIComponent(errorParam)}`);
            }
            if (successParam || errorParam) {
                window.history.replaceState(null, '', window.location.pathname);
            }
            return successParam;
        };

        const checkStatus = async (isAfterRedirect = false) => {
            try {
                setIsLoading(true);
                const response = await api.get('/accurate/status');
                const newStatus = response.data;
                setStatus(newStatus);

                if ((newStatus.connected && !newStatus.dbSelected) || (isAfterRedirect && newStatus.connected)) {
                    const dbResponse = await api.get('/accurate/databases');
                    setDatabases(dbResponse.data);
                }
            } catch (error) {
                console.error('Error fetching Accurate status:', error);
                toast.error('Gagal memeriksa status integrasi Accurate.');
            } finally {
                setIsLoading(false);
            }
        };

        const successRedirect = handleUrlParams();
        checkStatus(!!successRedirect);

    }, []);

    const handleConnectClick = async () => {
        try {
            const response = await api.get('/accurate/authorize-url');
            window.location.href = response.data.url;
        } catch (error) {
            console.error('Failed to get authorization URL:', error);
            toast.error('Gagal memulai koneksi. Cek konsol untuk detail.');
        }
    };

    const handleSelectDatabase = async () => {
        if (!selectedDb) {
            toast.error('Silakan pilih database terlebih dahulu.');
            return;
        }
        try {
            setIsSubmitting(true);
            await api.post('/accurate/open-database', { id: selectedDb });
            toast.success('Database berhasil dipilih dan disimpan!');
            setStatus({ connected: true, dbSelected: true });
        } catch (error) {
            console.error('Error selecting database:', error);
            toast.error('Gagal memilih database.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderContent = () => {
        if (isLoading) {
            return <div className="flex items-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memeriksa status...</div>;
        }

        if (status.connected && status.dbSelected) {
            return (
                <div className="flex items-center space-x-2">
                    <span className="text-green-600 font-semibold">✅ Terhubung & Database Terpilih</span>
                    <Button variant="outline" disabled>Sudah Terkonfigurasi</Button>
                </div>
            );
        }
        
        if (status.connected && !status.dbSelected) {
            return (
                <div className="space-y-4">
                    <p className="text-sm text-green-600 font-semibold">✅ Terhubung dengan Akun Accurate.</p>
                    <p className="text-sm text-muted-foreground">Langkah selanjutnya: Pilih database yang akan disinkronkan.</p>
                    <div className="flex items-center space-x-2">
                        <Select onValueChange={setSelectedDb} value={selectedDb}>
                            <SelectTrigger className="w-[280px]">
                                <SelectValue placeholder="Pilih database..." />
                            </SelectTrigger>
                            <SelectContent>
                                {databases.length > 0 ? (
                                    databases.map(db => <SelectItem key={db.id} value={db.id.toString()}>{db.alias}</SelectItem>)
                                ) : (
                                    <div className="p-4 text-sm text-muted-foreground">Memuat database...</div>
                                )}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleSelectDatabase} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Pilih & Simpan
                        </Button>
                    </div>
                </div>
            );
        }

        return <Button onClick={handleConnectClick}>Hubungkan ke Accurate</Button>;
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Integrasi Accurate ERP</CardTitle>
                <CardDescription>
                    Hubungkan akun Accurate dan pilih database untuk memulai sinkronisasi.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {renderContent()}
            </CardContent>
        </Card>
    );
};

// ====================================================================
// KOMPONEN YANG SUDAH ADA (TIDAK DIUBAH)
// ====================================================================
type WarehouseAddressFormValues = {
    WAREHOUSE_PIC_NAME: string;
    WAREHOUSE_PHONE: string;
    WAREHOUSE_FULL_ADDRESS: string;
};

function WarehouseAddressForm({ allSettings, isLoading }: { allSettings: AppSetting[] | undefined, isLoading: boolean }) {
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const warehouseForm = useForm<WarehouseAddressFormValues>();

    const settingsMap = new Map(allSettings?.map(s => [s.key, s.value]));
    const hasExistingAddress = !!settingsMap.get('WAREHOUSE_FULL_ADDRESS');

    useEffect(() => {
        if (allSettings) {
            warehouseForm.reset({
                WAREHOUSE_PIC_NAME: settingsMap.get('WAREHOUSE_PIC_NAME') || '',
                WAREHOUSE_PHONE: settingsMap.get('WAREHOUSE_PHONE') || '',
                WAREHOUSE_FULL_ADDRESS: settingsMap.get('WAREHOUSE_FULL_ADDRESS') || '',
            });
            if (!hasExistingAddress) {
                setIsEditing(true);
            }
        }
    }, [allSettings, warehouseForm, hasExistingAddress]);

    const warehouseMutation = useMutation({
        mutationFn: (payload: SettingPayload[]) => updateMultipleSettings(payload),
        onSuccess: () => {
            toast.success('Alamat gudang berhasil diperbarui!');
            setIsEditing(false);
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
                        <Edit className="mr-2 h-4 w-4" /> Edit Alamat
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
                                <FormItem><RHFormLabel>Nama Penanggung Jawab (PIC)</RHFormLabel><FormControl><Input placeholder="Contoh: Budi Santoso" {...field} /></FormControl></FormItem>
                            )} />
                            <FormField control={warehouseForm.control} name="WAREHOUSE_PHONE" render={({ field }) => (
                                <FormItem><RHFormLabel>Nomor Telepon PIC</RHFormLabel><FormControl><Input placeholder="Contoh: 081234567890" {...field} /></FormControl></FormItem>
                            )} />
                            <FormField control={warehouseForm.control} name="WAREHOUSE_FULL_ADDRESS" render={({ field }) => (
                                <FormItem><RHFormLabel>Alamat Lengkap Gudang</RHFormLabel><FormControl><Textarea placeholder="Jl. Raya Vespa No. 123, RT 01/RW 02, Kelurahan Cirimekar..." {...field} /></FormControl></FormItem>
                            )} />
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

function AreaCombobox({ query, onQueryChange, options, onSelect, selectedValue, isLoading }: any) {
    const [open, setOpen] = useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                    {selectedValue ? selectedValue.label : "Pilih lokasi..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" sideOffset={5} align="start">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="Ketik nama kecamatan atau kode pos..."
                        value={query}
                        onValueChange={onQueryChange}
                    />
                    <CommandEmpty>
                        {isLoading ? 'Mencari...' : 'Lokasi tidak ditemukan.'}
                    </CommandEmpty>
                    <CommandGroup className="max-h-60 overflow-y-auto">
                        {options?.map((option: LocationData) => (
                            <CommandItem
                                key={option.id}
                                value={option.label}
                                onSelect={() => {
                                    onSelect(option);
                                    setOpen(false);
                                }}
                            >
                                <Check className={cn("mr-2 h-4 w-4", selectedValue?.id === option.id ? "opacity-100" : "opacity-0")} />
                                <div className="flex-1">
                                    <p className="text-sm">{option.label}</p>
                                    <p className="text-xs text-muted-foreground">Kode Pos: {option.postalCode}</p>
                                </div>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </Command>
            </PopoverContent>
        </Popover>
    );
}


// ====================================================================
// KOMPONEN UTAMA HALAMAN SETTINGS
// ====================================================================
export default function SettingsPage() {
    const queryClient = useQueryClient();
    const [originSearchQuery, setOriginSearchQuery] = useState('');
    const [selectedOrigin, setSelectedOrigin] = useState<LocationData | null>(null);
    const [originPostalCode, setOriginPostalCode] = useState('');

    const { data: allSettings, isLoading: isLoadingSettings } = useQuery({
        queryKey: ['settings'],
        queryFn: getAllSettings,
        refetchOnWindowFocus: false,
        onSuccess: (data) => {
            const currentPostalCode = data.find(s => s.key === 'BITESHIP_ORIGIN_POSTAL_CODE')?.value;
            if (currentPostalCode) {
                setOriginPostalCode(currentPostalCode);
            }
        }
    });

    const currentOriginLabel = allSettings?.find(s => s.key === 'BITESHIP_ORIGIN_AREA_LABEL')?.value;

    const { data: originOptions, isLoading: isLoadingOriginOptions } = useQuery({
        queryKey: ['shippingAreas', originSearchQuery],
        queryFn: () => searchAreas(originSearchQuery),
        enabled: originSearchQuery.length >= 3,
    });

    const originMutation = useMutation({
        mutationFn: (newOrigin: { id: string; label: string; postalCode: string }) => updateMultipleSettings([
            { key: 'BITESHIP_ORIGIN_AREA_ID', value: newOrigin.id },
            { key: 'BITESHIP_ORIGIN_AREA_LABEL', value: newOrigin.label },
            { key: 'BITESHIP_ORIGIN_POSTAL_CODE', value: newOrigin.postalCode }
        ]),
        onSuccess: () => {
            toast.success('Lokasi asal pengiriman berhasil diperbarui!');
            queryClient.invalidateQueries({ queryKey: ['settings'] });
            setSelectedOrigin(null);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Gagal menyimpan pengaturan.');
        },
    });

    const handleSaveOrigin = () => {
        if ((selectedOrigin || currentOriginLabel) && originPostalCode) {
            const areaToSave = selectedOrigin || { id: allSettings?.find(s => s.key === 'BITESHIP_ORIGIN_AREA_ID')?.value, label: currentOriginLabel, postalCode: originPostalCode };
            if (areaToSave.id && areaToSave.label) {
                originMutation.mutate({
                    id: areaToSave.id,
                    label: areaToSave.label,
                    postalCode: originPostalCode
                });
            } else {
                toast.error('Harap pilih lokasi terlebih dahulu.');
            }
        } else {
            toast.error('Harap pilih lokasi dan isi kode pos asal.');
        }
    };

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Pengaturan Aplikasi</h1>
                <p className="text-muted-foreground">Kelola konfigurasi global untuk toko online dan panel admin Anda.</p>
            </div>

            <div className="space-y-6">
                <AccurateIntegration />
                
                {/* KOMPONEN PPN DITAMBAHKAN DI SINI */}
                <VatSettings />

                <Card>
                    <CardHeader>
                        <CardTitle>Asal Pengiriman (Biteship)</CardTitle>
                        <CardDescription>Pilih lokasi dan masukkan kode pos gudang untuk perhitungan ongkos kirim.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoadingSettings ? (
                            <div className="flex items-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat...</div>
                        ) : (
                            <p className="text-sm text-muted-foreground mb-4">
                                Lokasi saat ini:{' '}
                                <span className="font-mono bg-secondary px-2 py-1 rounded-md">{currentOriginLabel || 'Belum diatur'}</span>
                            </p>
                        )}
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                <div className="space-y-2 md:col-span-1">
                                    <Label>Cari Kecamatan Asal (ganti jika perlu)</Label>
                                    <AreaCombobox
                                        query={originSearchQuery}
                                        onQueryChange={setOriginSearchQuery}
                                        options={originOptions}
                                        onSelect={(area: LocationData) => {
                                            setSelectedOrigin(area);
                                            setOriginPostalCode(area.postalCode);
                                        }}
                                        selectedValue={selectedOrigin}
                                        isLoading={isLoadingOriginOptions}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Kode Pos Asal</Label>
                                    <Input
                                        placeholder="Pilih area dahulu"
                                        value={originPostalCode}
                                        onChange={(e) => setOriginPostalCode(e.target.value)}
                                        readOnly
                                        className="bg-gray-100 cursor-not-allowed"
                                    />
                                </div>
                                <Button onClick={handleSaveOrigin} disabled={originMutation.isPending}>
                                    <Save className="mr-2 h-4 w-4" /> Simpan Lokasi Asal
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <WarehouseAddressForm allSettings={allSettings} isLoading={isLoadingSettings} />
            </div>
        </div>
    );
}