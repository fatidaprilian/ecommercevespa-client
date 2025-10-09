// app/terms-and-conditions/page.tsx
import CmsPageViewer from "@/components/organisms/CmsPageViewer";
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const Loading = () => (
  <div className="flex justify-center items-center min-h-[50vh]">
    <Loader2 className="w-10 h-10 animate-spin text-primary" />
  </div>
);

export default function TermsAndConditionsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CmsPageViewer slug="terms-and-conditions" />
    </Suspense>
  );
}