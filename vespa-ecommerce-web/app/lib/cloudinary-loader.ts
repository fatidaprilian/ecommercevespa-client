// image-loader.ts

const CLOUDFLARE_WORKER_URL = 'https://jss-image-proxy.faridaprilian215.workers.dev'; // <--- GANTI INI

type LoaderProps = {
  src: string;
  width: number;
  quality?: number;
};

export default function imageLoader({ src }: LoaderProps): string {
  if (src.startsWith('/')) return src;
  if (!src.includes('res.cloudinary.com')) return src;

  try {
    const urlObj = new URL(src);
    const pathName = urlObj.pathname; // /dm7jsgfc7/image/upload/v123...
    
    // Langsung tembak ke Worker!
    // Browser -> Worker -> Cloudinary
    // VPS tidak terlibat sama sekali.
    return `${CLOUDFLARE_WORKER_URL}${pathName}`;
    
  } catch (error) {
    return src;
  }
}