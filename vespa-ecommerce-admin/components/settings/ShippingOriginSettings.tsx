'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Save, ChevronsUpDown, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { searchAreas, LocationData } from '@/services/shippingService';
import { updateMultipleSettings, AppSetting } from '@/services/settingsService';

interface AreaComboboxProps {
    query: string;
    onQueryChange: (q: string) => void;
    options: LocationData[] | undefined;
    onSelect: (area: LocationData) => void;
    selectedValue: LocationData | null;
    isLoading: boolean;
}

function AreaCombobox({ query, onQueryChange, options, onSelect, selectedValue, isLoading }: AreaComboboxProps) {
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

interface ShippingOriginSettingsProps {
    allSettings: AppSetting[] | undefined;
    isLoadingSettings: boolean;
}

export const ShippingOriginSettings = ({ allSettings, isLoadingSettings }: ShippingOriginSettingsProps) => {
    const queryClient = useQueryClient();
    const [originSearchQuery, setOriginSearchQuery] = useState('');
    const [selectedOrigin, setSelectedOrigin] = useState<LocationData | null>(null);
    const [originPostalCode, setOriginPostalCode] = useState('');

    useEffect(() => {
        if (allSettings) {
            const currentPostalCode = allSettings.find(s => s.key === 'BITESHIP_ORIGIN_POSTAL_CODE')?.value;
            if (currentPostalCode) {
                setOriginPostalCode(currentPostalCode);
            }
        }
    }, [allSettings]);

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
                            {originMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Simpan Lokasi Asal
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default ShippingOriginSettings;
