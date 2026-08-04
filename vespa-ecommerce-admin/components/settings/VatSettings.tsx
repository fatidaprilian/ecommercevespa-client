'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { getVatSetting, updateVatSetting } from '@/services/settingsService';

export const VatSettings = () => {
  const [vatValue, setVatValue] = useState('');
  const queryClient = useQueryClient();

  const { data: vatData, isLoading: isLoadingVat } = useQuery({
    queryKey: ['vatSetting'],
    queryFn: getVatSetting,
  });

  useEffect(() => {
    if (vatData && typeof vatData.value === 'number') {
      setVatValue(vatData.value.toString());
    }
  }, [vatData]);

  const mutation = useMutation({
    mutationFn: (newValue: number) => updateVatSetting(newValue),
    onSuccess: () => {
      toast.success('Pengaturan PPN berhasil disimpan!');
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

export default VatSettings;