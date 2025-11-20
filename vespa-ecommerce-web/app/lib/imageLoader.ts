'use client';

interface ImageLoaderParams {
  src: string;
  width: number;
  quality?: number;
}

export default function imageLoader({ src, width, quality }: ImageLoaderParams) {
  // 1. Settingan Default Next.js Proxy
  const nextJsProxy = '/_next/image';
  const q = quality || 75;

  // 2. Jika ini File LOKAL (Logo, Banner lokal), biarkan standar
  if (src.startsWith('/')) {
    return `${nextJsProxy}?url=${encodeURIComponent(src)}&w=${width}&q=${q}`;
  }

  // 3. Jika ini File CLOUDINARY
  if (src.includes('res.cloudinary.com')) {
    // Kita inject parameter resize Cloudinary (w_{width}, f_auto) ke dalam URL aslinya
    // Supaya server Next.js Anda mendownload file yang SUDAH KECIL dari Cloudinary
    const params = `f_auto,q_auto,w_${width},c_limit`;
    
    let optimizedUrl = src;
    // Cek biar gak double param
    if (!src.includes('/upload/f_auto') && src.includes('/upload/')) {
         const [base, ...rest] = src.split('/upload/');
         optimizedUrl = `${base}/upload/${params}/${rest.join('/upload/')}`;
    }

    // Kembalikan URL Proxy Next.js (Anti-Blokir) tapi isinya URL Cloudinary yang Ringan (Anti-Timeout)
    return `${nextJsProxy}?url=${encodeURIComponent(optimizedUrl)}&w=${width}&q=${q}`;
  }

  // 4. Fallback untuk gambar external lain
  return `${nextJsProxy}?url=${encodeURIComponent(src)}&w=${width}&q=${q}`;
}