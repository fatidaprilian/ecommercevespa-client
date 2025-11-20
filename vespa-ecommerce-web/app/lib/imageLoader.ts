'use client';

interface ImageLoaderParams {
  src: string;
  width: number;
  quality?: number;
}

export default function imageLoader({ src, width, quality }: ImageLoaderParams) {
  // 1. Settingan Default Next.js Proxy (Anti-Blokir ISP)
  const nextJsProxy = '/_next/image';
  const q = quality || 75;

  // 2. Jika ini File LOKAL (Logo, Banner lokal di folder public)
  if (src.startsWith('/')) {
    return `${nextJsProxy}?url=${encodeURIComponent(src)}&w=${width}&q=${q}`;
  }

  // 3. Jika ini File CLOUDINARY (Target Optimasi Anti-Timeout)
  if (src.includes('cloudinary.com')) {
    // Parameter optimasi Cloudinary
    const params = `f_auto,q_auto,w_${width},c_limit`;
    
    let optimizedUrl = src;
    
    // Logika untuk menyisipkan parameter: Pisahkan path "/upload/" dan sisipkan parameter baru
    if (src.includes('/upload/')) {
        const [base, ...rest] = src.split('/upload/');
        optimizedUrl = `${base}/upload/${params}/${rest.join('/upload/')}`;
    }

    // Kembalikan URL Proxy Next.js (Anti-Blokir) dengan URL Cloudinary yang sudah Ringan
    return `${nextJsProxy}?url=${encodeURIComponent(optimizedUrl)}&w=${width}&q=${q}`;
  }

  // 4. Fallback untuk gambar external lain
  return `${nextJsProxy}?url=${encodeURIComponent(src)}&w=${width}&q=${q}`;
}