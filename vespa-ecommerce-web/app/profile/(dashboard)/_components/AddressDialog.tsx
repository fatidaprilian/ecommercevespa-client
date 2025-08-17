// file: app/profile/(dashboard)/_components/AddressDialog.tsx
'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Loader2, Check, ChevronsUpDown } from 'lucide-react';
import { useEffect, useState } from 'react';

import { getProvinces, getCities, getDistricts } from '@/services/shippingService';
import { Address, createAddress, updateAddress, CreateAddressData } from '@/services/addressService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';


// Skema Validasi
const addressSchema = z.object({
  street: z.string().min(10, "Alamat jalan lengkap diperlukan."),
  province: z.object({ id: z.string(), name: z.string() }, { required_error: "Provinsi harus dipilih." }),
  city: z.object({ id: z.string(), name: z.string() }, { required_error: "Kota harus dipilih." }),
  district: z.object({ id: z.string(), name: z.string() }, { required_error: "Kecamatan harus dipilih." }),
  postalCode: z.string().min(5, "Kode pos 5 digit diperlukan."),
  isDefault: z.boolean().default(false),
});
type AddressFormValues = z.infer<typeof addressSchema>;

// Props untuk komponen
interface AddressDialogProps {
  initialData?: Address | null;
  onSave: () => void;
  onClose: () => void;
}

export function AddressDialog({ initialData, onSave, onClose }: AddressDialogProps) {
  const isEditing = !!initialData;

  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: { isDefault: false },
  });

  // Isi form jika sedang dalam mode edit
  useEffect(() => {
    if (isEditing && initialData) {
      form.reset({
        street: initialData.street,
        postalCode: initialData.postalCode,
        isDefault: initialData.isDefault,
        province: { id: initialData.provinceId, name: initialData.province },
        city: { id: initialData.cityId, name: initialData.city },
        district: { id: initialData.districtId, name: initialData.district },
      });
    }
  }, [isEditing, initialData, form]);

  const mutation = useMutation({
    mutationFn: (data: CreateAddressData) => 
        isEditing ? updateAddress({ id: initialData!.id, addressData: data }) : createAddress(data),
    onSuccess: () => {
        toast.success(`Alamat berhasil ${isEditing ? 'diperbarui' : 'disimpan'}!`);
        onSave();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Gagal menyimpan alamat.')
  });

  const onSubmit = (data: AddressFormValues) => {
    const payload: CreateAddressData = {
      street: data.street,
      postalCode: data.postalCode,
      isDefault: data.isDefault,
      provinceId: data.province.id, province: data.province.name,
      cityId: data.city.id, city: data.city.name,
      districtId: data.district.id, district: data.district.name,
    };
    mutation.mutate(payload);
  };
  
  // State & Query untuk Combobox dinamis
  const selectedProvinceId = form.watch('province')?.id;
  const selectedCityId = form.watch('city')?.id;
  const { data: provinces } = useQuery({ queryKey: ['provinces'], queryFn: getProvinces });
  const { data: cities, isLoading: isLoadingCities } = useQuery({
      queryKey: ['cities', selectedProvinceId],
      queryFn: () => getCities(selectedProvinceId!),
      enabled: !!selectedProvinceId,
  });
  const { data: districts, isLoading: isLoadingDistricts } = useQuery({
      queryKey: ['districts', selectedCityId],
      queryFn: () => getDistricts(selectedCityId!),
      enabled: !!selectedCityId,
  });

  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Edit Alamat' : 'Tambah Alamat Baru'}</DialogTitle>
        <DialogDescription>Pastikan alamat yang Anda masukkan sudah benar.</DialogDescription>
      </DialogHeader>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <Textarea {...form.register("street")} placeholder="Alamat Lengkap (Jalan, No. Rumah, RT/RW)" />
        <Combobox data={provinces || []} control={form.control} name="province" placeholder="Pilih Provinsi" onSelect={() => { form.setValue('city', undefined as any); form.setValue('district', undefined as any); }} />
        <Combobox data={cities || []} control={form.control} name="city" placeholder="Pilih Kota" disabled={!selectedProvinceId || isLoadingCities} onSelect={() => { form.setValue('district', undefined as any); }} />
        <Combobox data={districts || []} control={form.control} name="district" placeholder="Pilih Kecamatan" disabled={!selectedCityId || isLoadingDistricts} />
        <Input {...form.register("postalCode")} placeholder="Kode Pos" />
        <div className="flex items-center space-x-2">
            <Controller name="isDefault" control={form.control} render={({ field }) => (
                <Checkbox id="isDefault" checked={field.value} onCheckedChange={field.onChange} />
            )} />
            <label htmlFor="isDefault" className="text-sm font-medium">Jadikan alamat utama</label>
        </div>
        <DialogFooter className="pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
            Simpan Alamat
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

// Combobox Helper Component
function Combobox({ data, control, name, placeholder, disabled, onSelect }: any) {
    const [open, setOpen] = useState(false);
    return (
        <Controller control={control} name={name} render={({ field, fieldState }) => (
            <div>
            <Popover open={open} onOpenChange={setOpen} modal={true}>
                <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between font-normal" disabled={disabled}>
                        {field.value ? field.value.name : placeholder}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" sideOffset={5} align="start">
                    <Command><CommandInput placeholder={`Cari ${placeholder.split(' ')[1]?.toLowerCase() || 'item'}...`} />
                    <CommandEmpty>Tidak ditemukan.</CommandEmpty>
                    <CommandGroup className="max-h-60 overflow-y-auto">
                        {data.map((item: any) => (
                        <CommandItem key={item.id} value={item.name} onSelect={() => { 
                            field.onChange({ id: String(item.id), name: item.name }); 
                            if (onSelect) onSelect();
                            setOpen(false); 
                        }}>
                            <Check className={cn("mr-2 h-4 w-4", field.value?.id === String(item.id) ? "opacity-100" : "opacity-0")} />{item.name}
                        </CommandItem>
                        ))}
                    </CommandGroup>
                    </Command>
                </PopoverContent>
            </Popover>
            {fieldState.error && <p className="text-sm text-red-500 mt-1">{fieldState.error.message}</p>}
            </div>
        )} />
    );
}