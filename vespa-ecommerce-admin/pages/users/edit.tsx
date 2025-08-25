import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { getUserById, updateUserRole, Role } from '@/services/userService';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const userRoleSchema = z.object({
  role: z.nativeEnum(Role),
});
type UserRoleFormValues = z.infer<typeof userRoleSchema>;

export default function EditUserPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = router.query;
  const userId = typeof id === 'string' ? id : '';

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => getUserById(userId),
    enabled: !!userId,
  });

  const form = useForm<UserRoleFormValues>({
    resolver: zodResolver(userRoleSchema),
  });

  useEffect(() => {
    if (user) {
      form.reset({ role: user.role });
    }
  }, [user, form]);

  const updateMutation = useMutation({
    mutationFn: (values: UserRoleFormValues) => updateUserRole({ id: userId, role: values.role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Peran pengguna berhasil diperbarui!');
      router.push('/users');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal memperbarui peran.');
    },
  });

  const onSubmit = (values: UserRoleFormValues) => {
    updateMutation.mutate(values);
  };

  if (isLoading) return <p>Memuat data pengguna...</p>;
  if (isError) return <p>Pengguna tidak ditemukan.</p>;

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" asChild>
        <Link href="/users"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Edit Peran Pengguna</CardTitle>
          <CardDescription>
            Mengubah peran untuk: <span className="font-semibold">{user?.name} ({user?.email})</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Peran</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Pilih peran..." /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(Role).map((role) => (
                          <SelectItem key={role} value={role}>{role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}