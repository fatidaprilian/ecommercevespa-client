// file: vespa-ecommerce-web/app/checkout/_components/AddressForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, PackageCheck, PlusCircle, Check, ChevronsUpDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

import { getProvinces, getCities, getDistricts, ShippingCost } from '@/services/shippingService';
import { getAddresses, createAddress, Address, CreateAddressData } from '@/services/addressService';
import { useCartStore } from '@/store/cart';

// Komponen UI dari Shadcn
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
  onShippingSelect: (cost: number | null) => void;
}

export function AddressForm({ onShippingSelect }: AddressFormProps) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { createOrder, cart, selectedItems } = useCartStore();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
    const [shippingOptions, setShippingOptions] = useState<ShippingCost[]>([]);
    const [selectedShipping, setSelectedShipping] = useState<ShippingCost | null>(null);
    const [isCreatingOrder, setIsCreatingOrder] = useState(false);

    const { data: addresses, isLoading: isLoadingAddresses } = useQuery({
        queryKey: ['addresses'],
        queryFn: getAddresses,
        onSuccess: (data) => {
            if (!selectedAddress && data.length > 0) {
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
        if (selectedAddress) {
            console.log("DEV MODE: Menggunakan mock data untuk ongkir.");
            const mockShippingOptions: ShippingCost[] = [
                { service: 'REG', description: 'JNE Reguler (Mock)', cost: [{ value: 18000, etd: '2-3', note: '' }] },
                { service: 'YES', description: 'JNE Yakin Esok Sampai (Mock)', cost: [{ value: 32000, etd: '1', note: '' }] }
            ];
            setShippingOptions(mockShippingOptions);
            setSelectedShipping(null);
            onShippingSelect(null);
        }
    }, [selectedAddress, onShippingSelect]);
    
    const handleShippingSelect = (service: string) => {
        const shipping = shippingOptions.find(s => s.service === service) || null;
        setSelectedShipping(shipping);
        onShippingSelect(shipping ? shipping.cost[0].value : null);
    };

    const handleCreateOrder = async () => {
      if (!selectedAddress || !selectedShipping) {
        toast.error("Alamat dan layanan pengiriman harus dipilih.");
        return;
      }
      setIsCreatingOrder(true);
      
      const selectedCartItems = cart?.items?.filter(item => selectedItems.has(item.id)) || [];
      if (selectedCartItems.length === 0) {
        toast.error("Tidak ada item yang dipilih untuk dipesan.");
        setIsCreatingOrder(false);
        return;
      }
      
      const payload = {
        items: selectedCartItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        shippingAddress: `${selectedAddress.street}, ${selectedAddress.district}, ${selectedAddress.city}, ${selectedAddress.province}, ${selectedAddress.postalCode}`,
        shippingCost: Number(selectedShipping.cost[0].value),
        courier: `JNE - ${selectedShipping.description}`,
      };

      console.log("Mencoba membuat pesanan dengan payload:", JSON.stringify(payload, null, 2));
      
      try {
        // PERBAIKAN: Panggil createOrder dengan argumen yang benar
        const newOrder = await createOrder(
          payload.shippingAddress, 
          payload.shippingCost, 
          payload.courier
        );
        
        if (newOrder.invoiceUrl) {
          window.location.href = newOrder.invoiceUrl;
        } else {
          toast.error("URL pembayaran tidak ditemukan, mengarahkan ke detail pesanan.");
          router.push(`/orders/${newOrder.id}`);
        }
      } catch (error) {
        console.error("Gagal melanjutkan ke pembayaran.");
        // Toast error sudah ditangani di dalam store
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
                                    <DialogDescription>Pastikan alamat yang Anda masukkan sudah benar untuk pengiriman.</DialogDescription>
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
                             {addresses?.length === 0 && <p className="text-center text-gray-500 py-4">Anda belum memiliki alamat tersimpan.</p>}
                        </RadioGroup>
                    )}
                </CardContent>
            </Card>

            {shippingOptions.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>Pilih Pengiriman (JNE)</CardTitle></CardHeader>
                  {/* --- PERBAIKAN: 'asChild' dihapus dari sini --- */}
                  <CardContent> 
                    <RadioGroup onValueChange={handleShippingSelect} value={selectedShipping?.service}>
                        {shippingOptions.map(option => (
                          <Label key={option.service} htmlFor={option.service} className="flex items-center space-x-3 border p-4 rounded-md has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary cursor-pointer">
                              <RadioGroupItem value={option.service} id={option.service} />
                              <div className="font-normal w-full flex justify-between items-center">
                                <div>
                                    <p className="font-bold">{option.description} ({option.service})</p>
                                    <p className="text-sm text-gray-500">Estimasi: {option.cost[0].etd} hari</p>
                                </div>
                                <p className="font-semibold text-lg">Rp {option.cost[0].value.toLocaleString('id-ID')}</p>
                              </div>
                          </Label>
                        ))}
                    </RadioGroup>
                  </CardContent>
                </Card>
            )}

            <div className="flex justify-end mt-8">
                <Button onClick={handleCreateOrder} size="lg" disabled={!selectedAddress || !selectedShipping || isCreatingOrder}>
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

    const onValidationErrors = (errors: any) => {
        console.error("Validation Errors:", errors);
        toast.error("Harap lengkapi semua field alamat.");
    };
    
    return (
      <form onSubmit={form.handleSubmit(onSubmit, onValidationErrors)} className="space-y-4 pt-4">
        <div>
            <Textarea {...form.register("street")} placeholder="Alamat Lengkap (Jalan, No. Rumah, RT/RW)" />
            <p className="text-sm text-red-500 mt-1 h-4">{form.formState.errors.street?.message}</p>
        </div>
        <Controller control={form.control} name="province" render={({ field, fieldState }) => (
            <div>
                <Combobox data={provinces || []} value={field.value} onChange={(value) => {
                    field.onChange(value);
                    form.resetField('city');
                    form.resetField('district');
                }} placeholder="Pilih Provinsi" />
                <p className="text-sm text-red-500 mt-1 h-4">{fieldState.error?.message}</p>
            </div>
        )}/>
        <Controller control={form.control} name="city" render={({ field, fieldState }) => (
            <div>
                <Combobox data={cities || []} value={field.value} onChange={(value) => {
                    field.onChange(value);
                    form.resetField('district');
                }} placeholder="Pilih Kota" disabled={!selectedProvinceId || isLoadingCities} />
                <p className="text-sm text-red-500 mt-1 h-4">{fieldState.error?.message}</p>
            </div>
        )}/>
        <Controller control={form.control} name="district" render={({ field, fieldState }) => (
            <div>
                <Combobox data={districts || []} value={field.value} onChange={field.onChange} placeholder="Pilih Kecamatan" disabled={!selectedCityId || isLoadingDistricts} />
                <p className="text-sm text-red-500 mt-1 h-4">{fieldState.error?.message}</p>
            </div>
        )}/>
        <div>
            <Input {...form.register("postalCode")} placeholder="Kode Pos" />
            <p className="text-sm text-red-500 mt-1 h-4">{form.formState.errors.postalCode?.message}</p>
        </div>
        <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={closeModal}>Batal</Button>
            <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="animate-spin" /> : "Simpan Alamat"}
            </Button>
        </div>
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
    
    return (
        <Popover open={open} onOpenChange={setOpen} modal={false}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal" disabled={disabled}>
                    {value ? value.name : placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" sideOffset={5} align="start">
                <Command>
                    <CommandInput placeholder={`Cari ${placeholder.split(' ')[1]?.toLowerCase() || 'item'}...`} />
                    <CommandEmpty>Tidak ditemukan.</CommandEmpty>
                    <CommandGroup className="max-h-60 overflow-y-auto" onWheel={(e) => e.stopPropagation()}>
                        {data.map((item) => (
                            <CommandItem
                                key={item.id}
                                value={item.name}
                                onSelect={() => {
                                    onChange({ id: String(item.id), name: item.name });
                                    setOpen(false);
                                }}
                            >
                                <Check className={cn("mr-2 h-4 w-4", value?.id === String(item.id) ? "opacity-100" : "opacity-0")} />
                                {item.name}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
