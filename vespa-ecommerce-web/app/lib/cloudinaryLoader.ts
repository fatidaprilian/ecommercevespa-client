// app/lib/cloudinaryLoader.ts
'use client';

import { ImageLoaderProps } from 'next/image';

export default function cloudinaryLoader({ src, width, quality }: ImageLoaderProps) {
  // 1. ✅ PERBAIKAN: Cek apakah ini file lokal (diawali dengan '/')
  // Jika ya, kembalikan path aslinya agar diambil dari folder public proyek, bukan Cloudinary
  if (src.startsWith('/')) {
    return src;
  }

  const params = ['f_auto', 'c_limit', `w_${width}`, `q_${quality || 'auto'}`];
  
  // 2. Jika src adalah URL Cloudinary (dari database)
  if (src.includes('res.cloudinary.com')) {
    const [base, ...rest] = src.split('/upload/');
    // Masukkan parameter resize setelah /upload/
    return `${base}/upload/${params.join(',')}/${rest.join('/upload/')}`;
  }
  
  // 3. Fallback (jika Anda menggunakan Public ID Cloudinary saja)
  return `https://res.cloudinary.com/dm7jsgfc7/image/upload/${params.join(',')}${src}`;
}