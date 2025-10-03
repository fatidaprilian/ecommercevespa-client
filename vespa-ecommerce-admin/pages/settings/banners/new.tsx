// pages/settings/banners/new.tsx

import { BannerForm } from './_form';
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NewBannerPage() {
  return (
    <div className="space-y-6">
      <Link href="/settings/banners">
        <Button variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali ke Daftar Banner
        </Button>
      </Link>
      
      <BannerForm />
    </div>
  );
}