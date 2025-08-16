// file: app/checkout/_components/AddressForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, PackageCheck, PlusCircle, Check, ChevronsUpDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

// --- UBAH TIPE DATA SHIPPING COST AGAR SESUAI DENGAN API ---
import { getProvinces, getCities, getDistricts, calculateCost } from '@/services/shippingService';
import { ShippingCost as ApiShippingCost } from '@/types/checkout';
type ShippingCost = ApiShippingCost['costs'][0];
// -----------------------------------------------------------

import { getAddresses, createAddress, Address, CreateAddressData } from '@/services/addressService';
import { useCartStore } from '@/store/cart';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from '@/lib/utils';

const addressSchema = z.object({
  street: z.string().min(10, "Alamat jalan lengkap diperlukan."),
  province: z.object({ id: z.string(), name: z.string() }),
  city: z.object({ id: z.string(), name: z.string() }),
  district: z.object({ id: z.string(), name: z.string() }),
  postalCode: z.string().min(5, "Kode pos 5 digit diperlukan."),
}).required({
    province: true, city: true, district: true
});
type AddressFormValues = z.infer<typeof addressSchema>;

interface AddressFormProps {
  onShippingSelect: (cost: number | null, courier: string | null) => void;
}

export function AddressForm({ onShippingSelect }: AddressFormProps) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { createOrder, getTotalWeight } = useCartStore();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
    const [shippingOptions, setShippingOptions] = useState<({ courierName: string } & ShippingCost)[]>([]);
    const [selectedShippingService, setSelectedShippingService] = useState<string | null>(null);
    const [isCreatingOrder, setIsCreatingOrder] = useState(false);
    const [isCalculatingCost, setIsCalculatingCost] = useState(false);

    const { data: addresses, isLoading: isLoadingAddresses } = useQuery({
        queryKey: ['addresses'],
        queryFn: getAddresses,
        onSuccess: (data) => {
            if (!selectedAddress && Array.isArray(data) && data.length > 0) {
                const defaultAddress = data.find(addr => addr.isDefault) || data[0];
                setSelectedAddress(defaultAddress);
            }
        }
    });
    
    const addAddressMutation = useMutation({
        mutationFn: createAddress,
        onSuccess: (newAddress) => {
            toast.success("Alamat baru berhasil disimpan!");
            queryClient.invalidateQueries({ queryKey: ['addresses'] });
            setSelectedAddress(newAddress);
            setIsModalOpen(false);
        },
        onError: () => toast.error("Gagal menyimpan alamat.")
    });

    useEffect(() => {
        const fetchShippingCosts = async () => {
            if (!selectedAddress) return;

            setShippingOptions([]);
            setSelectedShippingService(null);
            onShippingSelect(null, null);
            const totalWeight = getTotalWeight();
            
            if (totalWeight > 0) {
                setIsCalculatingCost(true);
                const couriers: ('jne' | 'jnt')[] = ['jne', 'jnt'];
                
                try {
                    const costPromises = couriers.map(courier => 
                        calculateCost({
                            destination: selectedAddress.districtId,
                            weight: totalWeight,
                            courier: courier,
                        })
                    );

                    const results = await Promise.all(costPromises);
                    const allOptions: ({ courierName: string } & ShippingCost)[] = [];

                    results.forEach(result => {
                        if (result && result[0] && result[0].costs.length > 0) {
                            const courierName = result[0].name;
                            result[0].costs.forEach(cost => {
                                allOptions.push({ courierName, ...cost });
                            });
                        }
                    });

                    if (allOptions.length > 0) {
                        setShippingOptions(allOptions);
                        toast.success("Opsi pengiriman ditemukan!");
                    } else {
                        toast.error("Tidak ada opsi pengiriman untuk tujuan ini.");
                    }
                } catch (error) {
                    console.error("Gagal menghitung ongkos kirim:", error);
                    toast.error("Gagal menghitung ongkos kirim.");
                } finally {
                    setIsCalculatingCost(false);
                }
            }
        };

        fetchShippingCosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedAddress]);
    
    const handleShippingSelect = (serviceIdentifier: string) => {
        setSelectedShippingService(serviceIdentifier);
        const selectedOption = shippingOptions.find(opt => `${opt.courierName}-${opt.service}` === serviceIdentifier);
        
        if (selectedOption) {
            onShippingSelect(
                selectedOption.cost[0].value, 
                `${selectedOption.courierName} - ${selectedOption.description}`
            );
        } else {
            onShippingSelect(null, null);
        }
    };

    const handleCreateOrder = async () => {
      if (!selectedAddress || !selectedShippingService) {
        toast.error("Alamat dan layanan pengiriman harus dipilih.");
        return;
      }
      const selectedOption = shippingOptions.find(opt => `${opt.courierName}-${opt.service}` === selectedShippingService);
      if (!selectedOption) return;

      setIsCreatingOrder(true);
      
      const fullAddress = `${selectedAddress.street}, ${selectedAddress.district}, ${selectedAddress.city}, ${selectedAddress.province}, ${selectedAddress.postalCode}`;
      const shippingCost = Number(selectedOption.cost[0].value);
      const courier = `${selectedOption.courierName} - ${selectedOption.description}`;
      
      try {
        const newOrder = await createOrder(fullAddress, shippingCost, courier);
        if (newOrder && newOrder.redirect_url) {
          window.location.href = newOrder.redirect_url;
        } else {
          router.push(`/orders/${newOrder.id}`);
        }
      } catch (error) {
        console.error("Gagal melanjutkan ke pembayaran:", error);
      } finally {
        setIsCreatingOrder(false);
      }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                        <span>Pilih Alamat Pengiriman</span>
                        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Tambah Alamat</Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>Tambah Alamat Baru</DialogTitle>
                                    <DialogDescription>Pastikan alamat yang Anda masukkan sudah benar.</DialogDescription>
                                </DialogHeader>
                                <NewAddressForm mutation={addAddressMutation} closeModal={() => setIsModalOpen(false)} />
                            </DialogContent>
                        </Dialog>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoadingAddresses ? <p>Memuat alamat...</p> : (
                        <RadioGroup onValueChange={(id) => setSelectedAddress(addresses?.find(a => a.id === id) || null)} value={selectedAddress?.id}>
                            {addresses?.map(address => (
                                <Label key={address.id} htmlFor={address.id} className="flex items-center space-x-3 border p-4 rounded-md has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary cursor-pointer">
                                    <RadioGroupItem value={address.id} id={address.id} />
                                    <div>
                                        <p className="font-bold">{address.isDefault ? "Utama" : "Alamat"}</p>
                                        <p className="text-gray-600">{address.street}, {address.district}, {address.city}, {address.province} {address.postalCode}</p>
                                    </div>
                                </Label>
                            ))}
                            {addresses?.length === 0 && <p className="text-center text-gray-500 py-4">Anda belum memiliki alamat.</p>}
                        </RadioGroup>
                    )}
                </CardContent>
            </Card>

            {selectedAddress && (
                <Card>
                  <CardHeader><CardTitle>Pilih Pengiriman</CardTitle></CardHeader>
                  <CardContent> 
                    {isCalculatingCost ? (
                        <div className="flex items-center gap-2 text-gray-500"><Loader2 className="animate-spin h-4 w-4"/> Menghitung ongkos kirim...</div>
                    ) : (
                        <RadioGroup onValueChange={handleShippingSelect} value={selectedShippingService || ''}>
                            {shippingOptions.length > 0 ? shippingOptions.map(option => {
                                const id = `${option.courierName}-${option.service}`;
                                return (
                                  <Label key={id} htmlFor={id} className="flex items-center space-x-3 border p-4 rounded-md has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary cursor-pointer">
                                      <RadioGroupItem value={id} id={id} />
                                      <div className="font-normal w-full flex justify-between items-center">
                                        <div>
                                            <p className="font-bold">{option.courierName} - {option.description} ({option.service})</p>
                                            <p className="text-sm text-gray-500">Estimasi: {option.cost[0].etd} hari</p>
                                        </div>
                                        <p className="font-semibold text-lg">Rp {option.cost[0].value.toLocaleString('id-ID')}</p>
                                      </div>
                                  </Label>
                                )
                            }) : <p className="text-center text-gray-500">Tidak ada opsi pengiriman untuk alamat ini.</p>}
                        </RadioGroup>
                    )}
                  </CardContent>
                </Card>
            )}

            <div className="flex justify-end mt-8">
                <Button onClick={handleCreateOrder} size="lg" disabled={!selectedAddress || !selectedShippingService || isCreatingOrder || isCalculatingCost}>
                    {isCreatingOrder ? <Loader2 className="mr-2 animate-spin" /> : <PackageCheck className="mr-2" />}
                    {isCreatingOrder ? 'Memproses...' : 'Lanjutkan ke Pembayaran'}
                </Button>
            </div>
        </div>
    );
}

function NewAddressForm({ mutation, closeModal }: { mutation: any, closeModal: () => void }) {
    const form = useForm<AddressFormValues>({ resolver: zodResolver(addressSchema), mode: 'onChange' });
    const { data: provinces } = useQuery({ queryKey: ['provinces'], queryFn: getProvinces });
    const selectedProvinceId = form.watch('province')?.id;
    const { data: cities, isLoading: isLoadingCities } = useQuery({
        queryKey: ['cities', selectedProvinceId],
        queryFn: () => getCities(selectedProvinceId!),
        enabled: !!selectedProvinceId,
    });
    
    const selectedCityId = form.watch('city')?.id;
    const { data: districts, isLoading: isLoadingDistricts } = useQuery({
        queryKey: ['districts', selectedCityId],
        queryFn: () => getDistricts(selectedCityId!),
        enabled: !!selectedCityId,
    });

    const onSubmit = (data: AddressFormValues) => {
        const payload: CreateAddressData = {
            street: data.street, postalCode: data.postalCode,
            provinceId: data.province.id, province: data.province.name,
            cityId: data.city.id, city: data.city.name,
            districtId: data.district.id, district: data.district.name,
        };
        mutation.mutate(payload);
    };
    
    return (
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <div><Textarea {...form.register("street")} placeholder="Alamat Lengkap (Jalan, No. Rumah, RT/RW)" /><p className="text-sm text-red-500 mt-1 h-4">{form.formState.errors.street?.message}</p></div>
        <Controller control={form.control} name="province" render={({ field, fieldState }) => (<div><Combobox data={provinces || []} value={field.value} onChange={(value) => { field.onChange(value); form.resetField('city'); form.resetField('district'); }} placeholder="Pilih Provinsi" /><p className="text-sm text-red-500 mt-1 h-4">{fieldState.error?.message}</p></div>)}/>
        <Controller control={form.control} name="city" render={({ field, fieldState }) => (<div><Combobox data={cities || []} value={field.value} onChange={(value) => { field.onChange(value); form.resetField('district'); }} placeholder="Pilih Kota" disabled={!selectedProvinceId || isLoadingCities} /><p className="text-sm text-red-500 mt-1 h-4">{fieldState.error?.message}</p></div>)}/>
        <Controller control={form.control} name="district" render={({ field, fieldState }) => (<div><Combobox data={districts || []} value={field.value} onChange={field.onChange} placeholder="Pilih Kecamatan" disabled={!selectedCityId || isLoadingDistricts} /><p className="text-sm text-red-500 mt-1 h-4">{fieldState.error?.message}</p></div>)}/>
        <div><Input {...form.register("postalCode")} placeholder="Kode Pos" /><p className="text-sm text-red-500 mt-1 h-4">{form.formState.errors.postalCode?.message}</p></div>
        <div className="flex justify-end gap-2 pt-4"><Button type="button" variant="ghost" onClick={closeModal}>Batal</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? <Loader2 className="animate-spin" /> : "Simpan Alamat"}</Button></div>
      </form>
    );
}

function Combobox({ data, value, onChange, placeholder, disabled }: {
    data: { id: string | number, name: string }[],
    value: { id: string, name: string },
    onChange: (value: { id: string, name: string }) => void,
    placeholder: string,
    disabled?: boolean
}) {
    const [open, setOpen] = useState(false);
    return (<Popover open={open} onOpenChange={setOpen} modal={false}><PopoverTrigger asChild><Button variant="outline" role="combobox" className="w-full justify-between font-normal" disabled={disabled}>{value ? value.name : placeholder}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-[--radix-popover-trigger-width] p-0" sideOffset={5} align="start"><Command><CommandInput placeholder={`Cari ${placeholder.split(' ')[1]?.toLowerCase() || 'item'}...`} /><CommandEmpty>Tidak ditemukan.</CommandEmpty><CommandGroup className="max-h-60 overflow-y-auto" onWheel={(e) => e.stopPropagation()}>{data.map((item) => (<CommandItem key={item.id} value={item.name} onSelect={() => { onChange({ id: String(item.id), name: item.name }); setOpen(false); }}><Check className={cn("mr-2 h-4 w-4", value?.id === String(item.id) ? "opacity-100" : "opacity-0")} />{item.name}</CommandItem>))}</CommandGroup></Command></PopoverContent></Popover>);
}