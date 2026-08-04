'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Loader2, Edit, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel as RHFormLabel } from '@/components/ui/form';
import { updateMultipleSettings, AppSetting, SettingPayload } from '@/services/settingsService';

export type WarehouseAddressFormValues = {
    WAREHOUSE_PIC_NAME: string;
    WAREHOUSE_PHONE: string;
    WAREHOUSE_FULL_ADDRESS: string;
};

interface WarehouseAddressFormProps {
    allSettings: AppSetting[] | undefined;
    isLoading: boolean;
}

export const WarehouseAddressForm = ({ allSettings, isLoading }: WarehouseAddressFormProps) => {
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
            void queryClient.invalidateQueries({ queryKey: ['settings'] });
        },
        onError: (err: unknown) => {
            const errObj = err as { response?: { data?: { message?: string } } };
            toast.error(errObj.response?.data?.message || 'Gagal menyimpan alamat gudang.');
        }
    });

    const onWarehouseSubmit = (data: WarehouseAddressFormValues) => {
        const payload: SettingPayload[] = Object.entries(data).map(([key, value]) => ({ key, value }));
        warehouseMutation.mutate(payload);
    };

    const handleCancel = () => {
        warehouseForm.reset();
        setIsEditing(false);
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Alamat Gudang / Pickup</CardTitle>
                    <CardDescription>Informasi ini akan digunakan saat melakukan permintaan pickup kurir.</CardDescription>
                </div>
                {!isEditing && hasExistingAddress && (
                    <Button variant="outline" size="sm" onClick={() => { setIsEditing(true); }}>
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
};

export default WarehouseAddressForm;
