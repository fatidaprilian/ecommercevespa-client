// pages/settings/pages/index.tsx
'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import PageEditor from '@/components/settings/PageEditor';
import { Info, HelpCircle, ShieldCheck } from 'lucide-react';

export default function ManageContentPages() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manajemen Halaman Konten</h1>
        <p className="text-muted-foreground">
          Pilih halaman yang ingin diedit untuk memperbarui konten statis pada website utama Anda.
        </p>
      </div>

      <Tabs defaultValue="about-us" className="w-full space-y-6">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 max-w-lg">
          <TabsTrigger value="about-us" className="flex items-center gap-2">
            <Info className="h-4 w-4" /> Tentang Kami
          </TabsTrigger>
          <TabsTrigger value="faq" className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" /> FAQ
          </TabsTrigger>
          <TabsTrigger value="terms-and-conditions" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Syarat &amp; Ketentuan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="about-us" className="mt-4">
          <PageEditor 
            slug="about-us"
            pageTitle="Tentang Kami"
            pageDescription="Edit konten yang akan ditampilkan di halaman 'Tentang Kami'."
          />
        </TabsContent>

        <TabsContent value="faq" className="mt-4">
          <PageEditor 
            slug="faq"
            pageTitle="FAQ (Frequently Asked Questions)"
            pageDescription="Edit daftar pertanyaan dan jawaban yang sering ditanyakan pelanggan."
          />
        </TabsContent>

        <TabsContent value="terms-and-conditions" className="mt-4">
          <PageEditor 
            slug="terms-and-conditions"
            pageTitle="Syarat &amp; Ketentuan"
            pageDescription="Edit isi dari halaman Syarat &amp; Ketentuan layanan."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}