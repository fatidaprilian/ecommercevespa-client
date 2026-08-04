// app/lib/cloudinary-loader.ts

interface CustomImageLoaderProps {
  src: string;
  width?: number;
  quality?: number;
}

/**
 * Custom Next.js Image loader.
 * Optionally proxies Cloudinary assets through a Cloudflare Worker CDN when NEXT_PUBLIC_CLOUDFLARE_WORKER_URL is configured.
 * Otherwise falls back directly to the original Cloudinary source URL.
 */
export default function imageLoader({ src, width, quality }: CustomImageLoaderProps): string {
  if (!src) return '';
  if (src.startsWith('/')) return src;
  if (!src.includes('res.cloudinary.com')) return src;

  const workerUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_WORKER_URL;
  if (!workerUrl) {
    return src;
  }

  try {
    const urlObj = new URL(src);
    const params = new URLSearchParams();
    if (width) params.set('w', width.toString());
    if (quality) params.set('q', quality.toString());

    const queryString = params.toString();
    return `${workerUrl}${urlObj.pathname}${queryString ? `?${queryString}` : ''}`;
  } catch {
    return src;
  }
}