// file: image-loader.ts (Simpan di Root Project)

type LoaderProps = {
  src: string;
  width: number;
  quality?: number;
};

export default function imageLoader({ src }: LoaderProps): string {
  // 1. Jika file lokal, biarkan
  if (src.startsWith('/')) return src;

  // 2. Jika bukan Cloudinary, biarkan
  if (!src.includes('res.cloudinary.com')) return src;

  try {
    const urlObj = new URL(src);
    const pathName = urlObj.pathname; // /dadhqwzm7/image/upload/v123/gambar.jpg
    
    const uploadToken = '/upload/';
    const uploadIndex = pathName.indexOf(uploadToken);
    
    if (uploadIndex === -1) return src;

    const beforeUpload = pathName.slice(0, uploadIndex + uploadToken.length);
    const afterUpload = pathName.slice(uploadIndex + uploadToken.length);

    // HASIL: /cdn-images/dadhqwzm7/image/upload/f_auto/v123/gambar.jpg
    // Tambahkan 'f_auto' manual di sini agar format otomatis (WebP/AVIF)
    return `/cdn-images${beforeUpload}f_auto/${afterUpload}`;
    
  } catch (error) {
    return src;
  }
}