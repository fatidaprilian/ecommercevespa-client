// lib/cloudinaryLoader.ts
'use client';

import { ImageLoaderProps } from 'next/image';

export default function cloudinaryLoader({ src, width, quality }: ImageLoaderProps) {
  const params = ['f_auto', 'c_limit', `w_${width}`, `q_${quality || 'auto'}`];
  
  // Cek jika src sudah merupakan full URL Cloudinary
  if (src.includes('res.cloudinary.com')) {
    const [base, ...rest] = src.split('/upload/');
    // Masukkan parameter resize tepat setelah /upload/
    return `${base}/upload/${params.join(',')}/${rest.join('/upload/')}`;
  }
  
  // Jika src adalah path relatif
  return `https://res.cloudinary.com/dm7jsgfc7/image/upload/${params.join(',')}${src}`;
}