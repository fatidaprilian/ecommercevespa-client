'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';

export const ChangePasswordForm = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/auth/change-password', {
        oldPassword,
        newPassword,
      });
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Password berhasil diubah!');
      setOldPassword('');
      setNewPassword('');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message;
      if (Array.isArray(msg)) {
        toast.error(msg[0]);
      } else {
        toast.error(msg || 'Gagal mengubah password.');
      }
    },
  });

  const handleSave = () => {
    if (!oldPassword || !newPassword) {
      toast.error('Password lama dan password baru harus diisi.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password baru minimal 8 karakter.');
      return;
    }
    mutation.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Keamanan Akun</CardTitle>
        <CardDescription>
          Ubah password untuk akun yang sedang login saat ini.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="oldPassword">Password Lama</Label>
            <Input
              id="oldPassword"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Masukkan password lama"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">Password Baru</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimal 8 karakter"
            />
          </div>
        </div>
        <Button onClick={handleSave} disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Simpan Password
        </Button>
      </CardContent>
    </Card>
  );
};

export default ChangePasswordForm;
