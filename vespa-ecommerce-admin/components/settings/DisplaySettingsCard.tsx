'use client';

import Link from 'next/link';
import { ArrowRight, Image as ImageIcon, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const DisplaySettingsCard = () => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Pengaturan Tampilan & Konten</CardTitle>
                <CardDescription>
                    Kelola elemen visual, banner promo, dan halaman konten statis website Anda.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-4">
                    <Link href="/settings/banners">
                        <Button variant="outline" className="flex items-center gap-2">
                            <ImageIcon className="h-4 w-4" />
                            Kelola Banner Homepage
                            <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                    </Link>
                    <Link href="/settings/pages">
                        <Button variant="outline" className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Kelola Konten Halaman
                            <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
};

export default DisplaySettingsCard;
