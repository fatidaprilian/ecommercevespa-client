import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
// --- 👇 GANTI axios DENGAN api DARI lib/api ---
// import axios from "axios";
import api from '@/lib/api'; // Pastikan path ini benar
// ---------------------------------------------
import { useRouter } from "next/router";
import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
// Asumsi: Admin panel punya store serupa untuk menyimpan token
// import { useAuthStore } from '@/store/auth'; // Sesuaikan path jika berbeda

const formSchema = z.object({
  email: z.string().email({ message: "Format email tidak valid." }),
  password: z.string().min(1, { message: "Password tidak boleh kosong." }),
});

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Asumsi: Ambil fungsi setAuth dari store jika pakai Zustand
  // const { setAuth } = useAuthStore(); // Sesuaikan jika nama store/fungsi berbeda

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);
    try {
      // --- 👇 GUNAKAN instance 'api' YANG SUDAH DIKONFIGURASI ---
      // Hapus baseURL dan withCredentials dari sini
      const response = await api.post('/auth/login', values);
      // --------------------------------------------------------

      // --- 👇 SIMPAN TOKEN YANG DITERIMA ---
      const { access_token } = response.data;
      if (access_token) {
        // Cara 1: Jika pakai store seperti di 'app'
        // setAuth(null, access_token); // Asumsi user profile diambil nanti

        // Cara 2: Simpan manual ke localStorage
        localStorage.setItem('admin-token', access_token); // Ganti 'admin-token' jika perlu key berbeda

        console.log("Admin Login: Token disimpan.");
        router.push("/"); // Arahkan ke dashboard admin
      } else {
        throw new Error("Token tidak diterima dari server.");
      }
      // --- SELESAI PENYIMPANAN TOKEN ---

    } catch (err: any) {
      console.error("Admin Login failed:", err);
      setError(err.response?.data?.message || "Login gagal. Periksa kembali kredensial Anda.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl text-foreground">Admin Panel</CardTitle>
          <CardDescription className="text-primary">
            Silakan login untuk melanjutkan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* ... FormField email dan password (tidak berubah) ... */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Email</FormLabel>
                    <FormControl>
                      <Input placeholder="admin@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="******" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error && <p className="text-sm font-medium text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isLoading ? "Memproses..." : "Login"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}