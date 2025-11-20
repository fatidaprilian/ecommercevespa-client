'use client';

interface ImageLoaderParams {
  src: string;
  width: number;
  quality?: number;
}

export default function imageLoader({ src, width, quality }: ImageLoaderParams) {
  // 1. Settingan Default Next.js Proxy (Anti-Blokir)
  // URL ini mengarah ke server Next.js Anda sendiri (/next/image)
  const nextJsProxy = '/_next/image';
  const q = quality || 75;

  // 2. Jika ini File LOKAL (Logo, Banner lokal di folder public), biarkan standar
  if (src.startsWith('/')) {
    // encodeURIComponent penting agar karakter aneh di URL tidak merusak query
    return `${nextJsProxy}?url=${encodeURIComponent(src)}&w=${width}&q=${q}`;
  }

  // 3. Jika ini File CLOUDINARY (Target Optimasi)
  if (src.includes('cloudinary.com')) {
    // Kita inject parameter resize Cloudinary (w_{width}, f_auto) ke dalam URL aslinya
    // Tujuannya: Server Next.js Anda mendownload file yang SUDAH KECIL dari Cloudinary
    // Ini mencegah Error 504 Gateway Timeout di server Anda
    
    // Format parameter optimasi Cloudinary:
    // f_auto: Format otomatis (WebP/AVIF)
    // q_auto: Kualitas otomatis yang bagus
    // w_{width}: Resize sesuai ukuran layar user
    // c_limit: Resize tanpa memotong (aspect ratio aman)
    const params = `f_auto,q_auto,w_${width},c_limit`;
    
    let optimizedUrl = src;
    
    // Cek biar gak double param (kalau URL database sudah ada '/upload/')
    if (!src.includes('/upload/f_auto') && src.includes('/upload/')) {
         const [base, ...rest] = src.split('/upload/');
         optimizedUrl = `${base}/upload/${params}/${rest.join('/upload/')}`;
    }

    // Kembalikan URL Proxy Next.js (Anti-Blokir) 
    // tapi isinya adalah URL Cloudinary yang SUDAH DI-OPTIMASI (Anti-Timeout)
    return `${nextJsProxy}?url=${encodeURIComponent(optimizedUrl)}&w=${width}&q=${q}`;
  }

  // 4. Fallback untuk gambar external lain (Unsplash, dll)
  return `${nextJsProxy}?url=${encodeURIComponent(src)}&w=${width}&q=${q}`;
}