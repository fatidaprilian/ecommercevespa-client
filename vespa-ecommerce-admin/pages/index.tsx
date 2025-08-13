// vespa-ecommerce-admin/pages/index.tsx

// Halaman ini akan dirender di dalam AdminLayout
export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        Selamat Datang, Admin!
      </h1>
      <p className="text-muted-foreground">
        Ini adalah halaman dasbor utama Anda. Silakan pilih menu di samping untuk memulai.
      </p>
      {/* Nanti kita bisa tambahkan statistik atau ringkasan di sini */}
    </div>
  );
}