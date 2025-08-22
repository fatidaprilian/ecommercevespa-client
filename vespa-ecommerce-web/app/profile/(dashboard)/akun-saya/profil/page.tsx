// file: app/profile/(dashboard)/akun-saya/profil/page.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useProfile } from '@/hooks/useProfile';
import { motion } from 'framer-motion';
import { Loader2, User, KeyRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateMyProfile } from '@/services/userService';
import { useAuthStore } from '@/store/auth'; // <-- 1. Import Auth Store

// Skema untuk update profil
const profileSchema = z.object({
  name: z.string().min(3, 'Nama minimal 3 karakter.'),
  email: z.string().email(),
});

// Skema untuk ganti password
const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Password saat ini harus diisi.'),
  newPassword: z.string().min(8, 'Password baru minimal 8 karakter.'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Konfirmasi password tidak cocok.",
  path: ["confirmPassword"],
});

export default function ProfilPage() {
  const queryClient = useQueryClient();
  const { data: user, isLoading: isLoadingProfile } = useProfile();
  
  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', email: '' },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
  });
  
  useEffect(() => {
    if (user) {
      profileForm.reset({ name: user.name, email: user.email });
    }
  }, [user, profileForm]);

  const profileMutation = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: (updatedUser) => {
      toast.success("Profil berhasil diperbarui!");
      // Perbarui data cache React Query
      queryClient.setQueryData(['my-profile'], updatedUser);
      
      // ✅ PERBAIKAN UTAMA: Sinkronkan state ke Zustand agar UI (Navbar, Sidebar) ikut ter-update
      const currentToken = useAuthStore.getState().token;
      useAuthStore.getState().setAuth(updatedUser, currentToken);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Gagal memperbarui profil.");
    }
  });

  const onProfileSubmit = (values: z.infer<typeof profileSchema>) => {
    // Hanya kirim field 'name' karena email tidak bisa diubah
    profileMutation.mutate({ name: values.name });
  };

  const onPasswordSubmit = (values: z.infer<typeof passwordSchema>) => {
    // TODO: Buat logika API untuk ganti password
    console.log(values);
    toast.success("Password berhasil diubah!");
    passwordForm.reset({currentPassword: '', newPassword: '', confirmPassword: ''});
  };

  if (isLoadingProfile) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-3"><User/> Informasi Pribadi</CardTitle>
          <CardDescription>Perbarui nama dan alamat email Anda.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
              <FormField control={profileForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Lengkap</FormLabel>
                  <FormControl><Input {...field} disabled={profileMutation.isPending} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={profileForm.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Alamat Email</FormLabel>
                  <FormControl><Input {...field} disabled /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex justify-end">
                <Button type="submit" disabled={profileMutation.isPending}>
                  {profileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-3"><KeyRound/> Ganti Password</CardTitle>
          <CardDescription>Pastikan Anda menggunakan password yang kuat.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
              <FormField control={passwordForm.control} name="currentPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel>Password Saat Ini</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel>Password Baru</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel>Konfirmasi Password Baru</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex justify-end">
                <Button type="submit">Ubah Password</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </motion.div>
  );
}