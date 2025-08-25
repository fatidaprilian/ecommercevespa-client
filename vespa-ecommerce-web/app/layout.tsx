import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/components/providers/QueryProvider';
import ConditionalNavbar from '@/components/layout/ConditionalNavbar';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });

export const metadata: Metadata = {
    title: 'Vespa Sparepart Ecommerce',
    description: 'Temukan sparepart Vespa original dan berkualitas.',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="id">
            <body
                className={`${inter.variable} ${playfair.variable} font-sans bg-[#F0F5F9] text-[#1E2022] flex flex-col min-h-screen`}
            >
                <QueryProvider>
                    <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
                    
                    <ConditionalNavbar />

                    <main className="flex-1">
                        {children}
                    </main>

                    <footer className="bg-[#1E2022] text-white p-6">
                        <div className="container mx-auto text-center">
                            <p>VespaPart Ecommerce &copy; 2025. Design by. kodekiri.com </p>
                        </div>
                    </footer>
                </QueryProvider>
            </body>
        </html>
    );
}