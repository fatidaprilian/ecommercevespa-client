'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Loader2, Check, ChevronsUpDown } from 'lucide-react';
import { useEffect, useState } from 'react';

// --- PERBAIKAN: Mengubah alias path ke relative path ---
import { searchAreas, AreaData } from '../../../services/shippingService';
import { Address, createAddress, updateAddress, CreateAddressData } from '../../../services/addressService';
// --- AKHIR PERBAIKAN ---

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

// --- PERBAIKAN: Mengubah alias path ke relative path ---
import { useDebounce } from '../../../hooks/useDebounce'; // Path diubah ke relative
// --- AKHIR PERBAIKAN ---


const phoneRegex = new RegExp(
  /^(\+62|62|0)8[1-9][0-9]{6,9}$/
);

const addressSchema = z.object({
  street: z.string().min(10, "Alamat jalan lengkap minimal 10 karakter."),
  area: z.object(
      { 
        id: z.string(), 
        label: z.string()
      },
      { required_error: "Area harus dipilih." }
  ),
  postalCode: z.string().min(5, "Kode pos harus 5 digit."),
  phone: z.string().regex(phoneRegex, 'Format nomor telepon tidak valid (contoh: 0812...).'),
  isDefault: z.boolean().default(false),
});

type AddressFormValues = z.infer<typeof addressSchema>;

interface AddressDialogProps {
  initialData?: Address | null;
  onSave: () => void;
  onClose: () => void;
}

export function AddressDialog({ initialData, onSave, onClose }: AddressDialogProps) {
  const isEditing = !!initialData;
  const queryClient = useQueryClient();

  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
        street: '',
        phone: '',
        area: undefined,
        postalCode: '',
        isDefault: false,
    },
    mode: 'onChange',
  });

  useEffect(() => {
    if (isEditing && initialData) {
      form.reset({
        street: initialData.street,
        postalCode: initialData.postalCode,
        phone: initialData.phone || '',
        isDefault: initialData.isDefault,
        area: {
            id: initialData.districtId,
            label: `${initialData.district}, ${initialData.city}, ${initialData.province}`,
        },
      });
    } else {
        form.reset({
            street: '',
            phone: '',
            area: undefined,
            postalCode: '',
            isDefault: false,
        });
    }
  }, [isEditing, initialData, form]);

  const mutation = useMutation({
    mutationFn: (data: CreateAddressData) =>
        isEditing ? updateAddress({ id: initialData!.id, addressData: data }) : createAddress(data),
    onSuccess: (data) => {
        toast.success(`Alamat berhasil ${isEditing ? 'diperbarui' : 'disimpan'}!`);
        queryClient.invalidateQueries({ queryKey: ['my-addresses'] });
        onSave();
    },
    onError: (err: any) => {
        const errorMessage = err.response?.data?.message?.[0] || 'Gagal menyimpan alamat.';
        toast.error(errorMessage);
    }
  });

  const onSubmit = (data: AddressFormValues) => {
    const [district, city, province] = data.area.label.split(', ').map(s => s.trim());
    const payload: CreateAddressData = {
      street: data.street,
      postalCode: data.postalCode,
      phone: data.phone,
      isDefault: data.isDefault,
      province,
      city,
      districtId: data.area.id,
      district,
    };
    mutation.mutate(payload);
  };

  // --- REVISI DEBOUNCE ---
  // 1. State 'areaQuery' tetap untuk input (real-time)
  const [areaQuery, setAreaQuery] = useState('');
  // 2. Buat value 'debounced' yang akan menunda 500ms
  const debouncedAreaQuery = useDebounce(areaQuery, 500);

  // 3. Gunakan value 'debounced' untuk useQuery
  const { data: areaOptions, isLoading: isLoadingAreas } = useQuery({
      queryKey: ['areas', debouncedAreaQuery], // <-- Diganti
      queryFn: () => searchAreas(debouncedAreaQuery), // <-- Diganti
      enabled: debouncedAreaQuery.length >= 3, // <-- Diganti
  });
  // --- AKHIR REVISI ---

  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Edit Alamat' : 'Tambah Alamat Baru'}</DialogTitle>
        <DialogDescription>Pastikan alamat yang Anda masukkan sudah benar.</DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">

          <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem><FormLabel>Nomor Telepon</FormLabel><FormControl><Input placeholder="Contoh: 0812..." {...field} /></FormControl><FormMessage /></FormItem>
          )}/>

          <FormField control={form.control} name="street" render={({ field }) => (
              <FormItem><FormLabel>Alamat Lengkap</FormLabel><FormControl><Textarea placeholder="Jalan, No. Rumah, RT/RW" {...field} /></FormControl><FormMessage /></FormItem>
          )}/>

          <FormField control={form.control} name="area" render={({ field }) => (
              <FormItem><FormLabel>Kecamatan/Area</FormLabel>
                <AreaCombobox
                    // Input tetap menggunakan 'areaQuery' (real-time)
                    query={areaQuery}
                    // Input tetap menggunakan 'setAreaQuery' (real-time)
                    onQueryChange={setAreaQuery}
                    options={areaOptions}
                    onSelect={(area: AreaData) => {
                      form.setValue('area', { id: area.id, label: area.label }, { shouldValidate: true, shouldDirty: true });
                      form.setValue('postalCode', area.postalCode, { shouldValidate: true });
                    }}
                    selectedValue={field.value}
                    isLoading={isLoadingAreas}
                />
                <FormMessage />
              </FormItem>
          )}/>

          <FormField control={form.control} name="postalCode" render={({ field }) => (
            <FormItem><FormLabel>Kode Pos</FormLabel><FormControl><Input placeholder="Pilih area dahulu" {...field} readOnly className="bg-gray-100"/></FormControl><FormMessage /></FormItem>
          )}/>
          
          <FormField control={form.control} name="isDefault" render={({ field }) => (
              <FormItem className="flex items-center space-x-2 pt-2">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel>Jadikan alamat utama</FormLabel>
              </FormItem>
          )}/>

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={mutation.isPending || !form.formState.isValid}>
              {mutation.isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
              Simpan Alamat
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}

function AreaCombobox({ query, onQueryChange, options, onSelect, selectedValue, isLoading }: any) {
    const [open, setOpen] = useState(false);
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                    {selectedValue ? selectedValue.label : "Cari kecamatan atau kode pos..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" sideOffset={5} align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                      placeholder="Ketik untuk mencari..."
                      value={query}
                      onValueChange={onQueryChange}
                  />
                  <CommandEmpty>
                      {isLoading ? 'Mencari...' : 'Lokasi tidak ditemukan.'}
                  </CommandEmpty>
                  <CommandGroup className="max-h-60 overflow-y-auto">
                      {options?.map((option: AreaData) => (
                      <CommandItem key={option.id} value={option.label} onSelect={() => {
                          onSelect(option);
                          setOpen(false);
                      }}>
                          <Check className={cn("mr-2 h-4 w-4", selectedValue?.id === String(option.id) ? "opacity-100" : "opacity-0")} />
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

