type LoaderProps = {
  src: string;
  width: number;
  quality?: number;
};

export default function cloudinaryLoader({ src, width, quality }: LoaderProps): string {
  // File lokal (public folder)
  if (src.startsWith('/')) {
    return src;
  }

  // Bukan Cloudinary
  if (!src.includes('res.cloudinary.com')) {
    return src;
  }

  // Cloudinary - inject transformation
  const params = [
    'f_auto',
    'c_limit',
    `w_${width}`,
    `q_${quality || 75}`
  ];

  const uploadIndex = src.indexOf('/upload/');
  
  if (uploadIndex === -1) {
    return src;
  }

  const beforeUpload = src.slice(0, uploadIndex + '/upload/'.length);
  const afterUpload = src.slice(uploadIndex + '/upload/'.length);

  return `${beforeUpload}${params.join(',')}/${afterUpload}`;
}