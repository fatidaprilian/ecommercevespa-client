// file: app/profile/(dashboard)/layout.tsx

import { SidebarNav } from "./_components/SidebarNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-50 min-h-screen pt-28">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 items-start">
          <aside className="md:col-span-1">
            <SidebarNav />
          </aside>
          <main className="md:col-span-3">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}