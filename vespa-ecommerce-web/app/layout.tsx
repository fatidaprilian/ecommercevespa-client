import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/components/providers/QueryProvider';
import Navbar from '@/components/layout/Navbar';

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
            <body className={`${inter.variable} ${playfair.variable} font-sans bg-[#F0F5F9] text-[#1E2022]`}>
                <QueryProvider>
                    <Navbar />
                    <main>
                        {children}
                    </main>
                    <footer className="bg-[#1E2022] text-white p-6 mt-12">
                        <div className="container mx-auto text-center">
                            <p>&copy; 2024 VespaPart Ecommerce. All rights reserved.</p>
                        </div>
                    </footer>
                </QueryProvider>
            </body>
        </html>
    );
}
