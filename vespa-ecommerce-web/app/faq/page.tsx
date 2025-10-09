// app/faq/page.tsx
import CmsPageViewer from "@/components/organisms/CmsPageViewer";
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const Loading = () => (
  <div className="flex justify-center items-center min-h-[50vh]">
    <Loader2 className="w-10 h-10 animate-spin text-primary" />
  </div>
);

export default function FaqPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CmsPageViewer slug="faq" />
    </Suspense>
  );
}