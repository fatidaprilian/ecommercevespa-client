// file: app/(auth)/_components/VerificationDialog.tsx

'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form
} from '@/components/ui/form';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';

interface VerificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
}

export function VerificationDialog({
  isOpen,
  onClose,
  email,
}: VerificationDialogProps) {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const queryClient = useQueryClient();

  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resendLoading, setResendLoading] = useState(false);

  const form = useForm({
    defaultValues: { token: '' },
  });

  // Timer untuk tombol resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0 && isOpen) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown, isOpen]);


  const onSubmit = async (data: { token: string }) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/verify-email', {
        email,
        token: data.token,
      });

      const profileResponse = await api.get('/users/profile', {
        headers: { Authorization: `Bearer ${response.data.access_token}` },
      });
      
      setAuth(profileResponse.data, response.data.access_token);
      await queryClient.invalidateQueries({ queryKey: ['products'] });

      toast.success('Verifikasi berhasil! Selamat datang.');
      router.push('/');
      onClose();

    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Kode verifikasi salah.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResendLoading(true);
    try {
        await api.post('/auth/resend-verification', { email });
        toast.success('Kode baru telah dikirim ke email Anda.');
        setResendCooldown(90);
    } catch (error) {
        toast.error('Gagal mengirim ulang kode.');
    } finally {
        setResendLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-green-500" />
          <DialogTitle className="text-2xl mt-2">Verifikasi Email Anda</DialogTitle>
          <DialogDescription>
            Kami telah mengirimkan 6 digit kode ke <strong>{email}</strong>. Silakan masukkan kode di bawah ini.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex justify-center">
                <InputOTP 
                    maxLength={6} 
                    autoComplete="one-time-code"
                    onComplete={(value) => {
                        form.setValue('token', value);
                        // Optional: Otomatis submit saat selesai diisi
                        form.handleSubmit(onSubmit)();
                    }}
                >
                    <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                    </InputOTPGroup>
                </InputOTP>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verifikasi & Masuk
            </Button>
          </form>
        </Form>
        <div className="mt-4 text-center text-sm text-gray-500">
          Tidak menerima kode?{' '}
          <button onClick={handleResendCode} disabled={resendCooldown > 0 || resendLoading} className="font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:text-gray-400">
            {resendLoading ? 'Mengirim...' : resendCooldown > 0 ? `Kirim ulang dalam ${resendCooldown}s` : 'Kirim ulang'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}