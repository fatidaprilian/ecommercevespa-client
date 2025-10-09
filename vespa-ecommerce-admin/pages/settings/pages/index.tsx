// pages/settings/pages/index.tsx
import PageEditor from '@/components/settings/PageEditor';

export default function ManageContentPages() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manajemen Halaman Konten</h1>
        <p className="text-muted-foreground">
          Edit konten untuk halaman statis yang tampil di website utama Anda.
        </p>
      </div>

      <div className="space-y-8">
        <PageEditor 
          slug="about-us"
          pageTitle="Tentang Kami"
          pageDescription="Edit konten yang akan ditampilkan di halaman 'Tentang Kami'."
        />
        <PageEditor 
          slug="faq"
          pageTitle="FAQ (Frequently Asked Questions)"
          pageDescription="Edit daftar pertanyaan dan jawaban yang sering ditanyakan."
        />
        <PageEditor 
          slug="terms-and-conditions"
          pageTitle="Syarat & Ketentuan"
          pageDescription="Edit isi dari halaman Syarat & Ketentuan layanan."
        />
      </div>
    </div>
  );
}