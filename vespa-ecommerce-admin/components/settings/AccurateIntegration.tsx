'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Check, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getAccurateStatus, getAccurateAuthUrl, disconnectAccurate } from '@/services/accurateService';
import api from '@/lib/api';

export const AccurateIntegration = () => {
    const queryClient = useQueryClient();
    const [databases, setDatabases] = useState<{ id: string; alias: string }[]>([]);
    const [selectedDb, setSelectedDb] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { data: status, isLoading, refetch } = useQuery({
        queryKey: ['accurateStatus'],
        queryFn: getAccurateStatus,
    });

    const disconnectMutation = useMutation({
        mutationFn: disconnectAccurate,
        onSuccess: (data) => {
            toast.success(data.message || 'Koneksi Accurate berhasil diputus.');
            queryClient.invalidateQueries({ queryKey: ['accurateStatus'] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Gagal memutus koneksi.');
        }
    });

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const success = urlParams.get('success');
        const error = urlParams.get('error');

        if (success) {
            toast.success('Berhasil terhubung dengan Akun Accurate!');
            refetch();
            window.history.replaceState(null, '', window.location.pathname);
        }
        if (error) {
            toast.error(`Gagal terhubung: ${decodeURIComponent(error)}`);
            window.history.replaceState(null, '', window.location.pathname);
        }
    }, [refetch]);

    const handleConnectClick = async () => {
        try {
            const { url } = await getAccurateAuthUrl();
            window.location.href = url;
        } catch (error) {
            toast.error('Gagal memulai koneksi ke Accurate.');
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
            queryClient.invalidateQueries({ queryKey: ['accurateStatus'] });
        } catch (error) {
            toast.error('Gagal memilih database.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const fetchDatabases = async () => {
        try {
            const dbResponse = await api.get('/accurate/databases');
            setDatabases(dbResponse.data);
        } catch (error) {
            toast.error("Gagal memuat daftar database.");
        }
    };
    
    useEffect(() => {
        if (status?.connected && !status.dbSelected) {
            fetchDatabases();
        }
    }, [status]);

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex items-center text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memeriksa status...
                </div>
            );
        }

        if (status?.connected && status.dbSelected) {
            return (
                <div className="flex items-center space-x-2">
                    <span className="text-green-600 font-semibold flex items-center gap-2">
                        <Check size={18} /> Terhubung & Database Terpilih
                    </span>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="destructive" size="sm" disabled={disconnectMutation.isPending}>
                                <LogOut className="mr-2 h-4 w-4" /> 
                                {disconnectMutation.isPending ? 'Memutus...' : 'Putuskan Koneksi'}
                           </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Anda Yakin?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Tindakan ini akan menghapus token dan sesi koneksi ke Accurate. Anda perlu melakukan otorisasi ulang untuk menghubungkannya kembali.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction onClick={() => disconnectMutation.mutate()}>
                                    Ya, Putuskan Koneksi
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            );
        }
        
        if (status?.connected && !status.dbSelected) {
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

export default AccurateIntegration;