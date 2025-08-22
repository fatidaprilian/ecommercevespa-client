import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getVatSetting, updateVatSetting } from '@/services/settingsService';

export default function VatSettings() {
  const [vat, setVat] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    getVatSetting()
      .then(data => setVat(data.value.toString()))
      .catch(() => setMessage('Gagal memuat PPN.'));
  }, []);

  const handleSave = async () => {
    setIsLoading(true);
    setMessage('');
    try {
      await updateVatSetting(parseFloat(vat));
      setMessage('PPN berhasil diperbarui!');
    } catch (error) {
      setMessage('Gagal menyimpan PPN. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pengaturan Pajak</CardTitle>
        <CardDescription>Atur persentase Pajak Pertambahan Nilai (PPN) yang berlaku untuk semua transaksi.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ppn">Persentase PPN (%)</Label>
          <Input
            id="ppn"
            type="number"
            value={vat}
            onChange={(e) => setVat(e.target.value)}
            placeholder="Contoh: 11"
          />
        </div>
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? 'Menyimpan...' : 'Simpan PPN'}
        </Button>
        {message && <p className="text-sm text-gray-600 mt-2">{message}</p>}
      </CardContent>
    </Card>
  );
}