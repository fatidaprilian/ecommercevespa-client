// file: app/(auth)/_components/ForgotPasswordDialog.tsx

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Loader2, Mail, ShieldCheck, KeyRound, CheckCircle2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

interface ForgotPasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'email' | 'token' | 'password' | 'success';

export function ForgotPasswordDialog({ isOpen, onClose }: ForgotPasswordDialogProps) {
  const [step, setStep] = useState<Step>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  
  const emailForm = useForm({ defaultValues: { email: '' } });
  const tokenForm = useForm({ defaultValues: { token: '' } });
  const passwordForm = useForm({ defaultValues: { password: '', confirmPassword: '' } });

  const handleEmailSubmit = async (data: { email: string }) => {
    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: data.email });
      setEmail(data.email);
      setStep('token');
      toast.success('Kode reset telah dikirim ke email Anda.');
    } catch (err) {
      toast.error('Gagal mengirim email reset.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTokenSubmit = async (data: { token: string }) => {
    setIsLoading(true);
    try {
      await api.post('/auth/validate-reset-token', { token: data.token });
      setToken(data.token);
      setStep('password');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Kode reset salah atau kedaluwarsa.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (data: { password: string, confirmPassword: string }) => {
    if (data.password !== data.confirmPassword) {
      passwordForm.setError('confirmPassword', { type: 'manual', message: 'Konfirmasi password tidak cocok.' });
      return;
    }
    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password: data.password });
      setStep('success');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mereset password.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetFlowAndClose = () => {
    setStep('email');
    setEmail('');
    setToken('');
    emailForm.reset();
    tokenForm.reset();
    passwordForm.reset();
    onClose();
  }

  const renderStep = () => {
    switch (step) {
      case 'email':
        return (
          <>
            <DialogHeader className="text-center">
              <Mail className="mx-auto h-12 w-12 text-primary" />
              <DialogTitle className="text-2xl mt-2">Lupa Password</DialogTitle>
              <DialogDescription>
                Masukkan alamat email Anda yang terdaftar untuk menerima kode reset.
              </DialogDescription>
            </DialogHeader>
            <Form {...emailForm}>
              <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-4 pt-4">
                <FormField control={emailForm.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input placeholder="email@anda.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Kirim Kode
                </Button>
              </form>
            </Form>
          </>
        );
      case 'token':
        return (
            <>
            <DialogHeader className="text-center">
              <ShieldCheck className="mx-auto h-12 w-12 text-green-500" />
              <DialogTitle className="text-2xl mt-2">Masukkan Kode Reset</DialogTitle>
              <DialogDescription>
                Kami telah mengirim kode 6 digit ke <strong>{email}</strong>.
              </DialogDescription>
            </DialogHeader>
            <Form {...tokenForm}>
              <form onSubmit={tokenForm.handleSubmit(handleTokenSubmit)} className="space-y-4 pt-4">
                 <div className="flex justify-center">
                    <InputOTP 
                        maxLength={6}
                        autoComplete="one-time-code"
                        onComplete={(value) => {
                            tokenForm.setValue('token', value);
                             // Optional: Otomatis submit saat selesai diisi
                            tokenForm.handleSubmit(handleTokenSubmit)();
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
                  Verifikasi Kode
                </Button>
              </form>
            </Form>
          </>
        );
      case 'password':
        return (
            <>
            <DialogHeader className="text-center">
              <KeyRound className="mx-auto h-12 w-12 text-primary" />
              <DialogTitle className="text-2xl mt-2">Atur Password Baru</DialogTitle>
              <DialogDescription>
                Masukkan password baru Anda. Pastikan password kuat dan mudah diingat.
              </DialogDescription>
            </DialogHeader>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4 pt-4">
                <FormField control={passwordForm.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password Baru</FormLabel>
                    <FormControl><Input type="password" placeholder="Minimal 8 karakter" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                 <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Konfirmasi Password Baru</FormLabel>
                    <FormControl><Input type="password" placeholder="Ulangi password baru" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Simpan Password Baru
                </Button>
              </form>
            </Form>
          </>
        );
        case 'success':
            return (
                <div className="text-center py-8">
                    <CheckCircle2 className="mx-auto h-16 w-16 text-green-500 mb-4"/>
                    <h2 className="text-2xl font-bold">Berhasil!</h2>
                    <p className="text-gray-600 mt-2 mb-6">Password Anda telah berhasil direset. Silakan login kembali dengan password baru Anda.</p>
                    <Button onClick={resetFlowAndClose} className="w-full">
                        Tutup
                    </Button>
                </div>
            )
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={resetFlowAndClose}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        {renderStep()}
      </DialogContent>
    </Dialog>
  );
}