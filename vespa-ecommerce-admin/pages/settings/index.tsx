// pages/settings/index.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { LayoutGrid, Truck, Plug, ShieldCheck } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getAllSettings } from '@/services/settingsService';

import { DisplaySettingsCard } from '@/components/settings/DisplaySettingsCard';
import { ShippingOriginSettings } from '@/components/settings/ShippingOriginSettings';
import { WarehouseAddressForm } from '@/components/settings/WarehouseAddressForm';
import { AccurateIntegration } from '@/components/settings/AccurateIntegration';
import { VatSettings } from '@/components/settings/VatSettings';
import { ChangePasswordForm } from '@/components/settings/ChangePasswordForm';

export default function SettingsPage() {
    const { data: allSettings, isLoading: isLoadingSettings } = useQuery({
        queryKey: ['settings'],
        queryFn: getAllSettings,
        refetchOnWindowFocus: false,
    });

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Pengaturan Aplikasi</h1>
                <p className="text-muted-foreground">Kelola konfigurasi global untuk toko online dan panel admin Anda.</p>
            </div>

            <Tabs defaultValue="tampilan" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-2 bg-muted/60 p-1.5 rounded-lg h-auto">
                    <TabsTrigger value="tampilan" className="flex items-center justify-center gap-2 py-2.5">
                        <LayoutGrid className="h-4 w-4" />
                        <span>Tampilan</span>
                    </TabsTrigger>
                    <TabsTrigger value="pengiriman" className="flex items-center justify-center gap-2 py-2.5">
                        <Truck className="h-4 w-4" />
                        <span>Pengiriman</span>
                    </TabsTrigger>
                    <TabsTrigger value="integrasi" className="flex items-center justify-center gap-2 py-2.5">
                        <Plug className="h-4 w-4" />
                        <span>Integrasi & Pajak</span>
                    </TabsTrigger>
                    <TabsTrigger value="keamanan" className="flex items-center justify-center gap-2 py-2.5">
                        <ShieldCheck className="h-4 w-4" />
                        <span>Keamanan</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="tampilan" className="space-y-6">
                    <DisplaySettingsCard />
                </TabsContent>

                <TabsContent value="pengiriman" className="space-y-6">
                    <ShippingOriginSettings allSettings={allSettings} isLoadingSettings={isLoadingSettings} />
                    <WarehouseAddressForm allSettings={allSettings} isLoading={isLoadingSettings} />
                </TabsContent>

                <TabsContent value="integrasi" className="space-y-6">
                    <AccurateIntegration />
                    <VatSettings />
                </TabsContent>

                <TabsContent value="keamanan" className="space-y-6">
                    <ChangePasswordForm />
                </TabsContent>
            </Tabs>
        </div>
    );
}