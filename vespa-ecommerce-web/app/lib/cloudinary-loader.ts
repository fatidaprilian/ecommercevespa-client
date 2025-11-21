// image-loader.ts

type LoaderProps = {
  src: string;
  width: number;
  quality?: number;
};

export default function imageLoader({ src }: LoaderProps): string {
  // 1. File lokal (biarkan)
  if (src.startsWith('/')) return src;

  // 2. Bukan Cloudinary (biarkan)
  if (!src.includes('res.cloudinary.com')) return src;

  try {
    const urlObj = new URL(src);
    const pathName = urlObj.pathname; // Contoh: /dadhqwzm7/image/upload/v123/gambar.jpg
    
    // Kita cari /upload/ cuma untuk validasi, tapi kita tidak akan menyisipkan parameter apapun.
    const uploadToken = '/upload/';
    const uploadIndex = pathName.indexOf(uploadToken);
    
    if (uploadIndex === -1) return src;

    // Hapus domain asli, ganti dengan proxy kita
    // Input: https://res.cloudinary.com/dadhqwzm7/image/upload/v123/foto.jpg
    // Output: /cdn-images/dadhqwzm7/image/upload/v123/foto.jpg
    return `/cdn-images${pathName}`;
    
  } catch (error) {
    return src;
  }
}