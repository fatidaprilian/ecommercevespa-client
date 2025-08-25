import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "axios";
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

const formSchema = z.object({
  email: z.string().email({ message: "Format email tidak valid." }),
  password: z.string().min(1, { message: "Password tidak boleh kosong." }),
});

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      
      await axios.post(`${apiUrl}/auth/login`, values, {
        withCredentials: true,
      });
      
      router.push("/"); 
    } catch (err: any) {
      console.error("Login failed:", err);
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