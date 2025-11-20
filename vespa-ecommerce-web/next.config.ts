import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  
  // Tambahan: Timeout diperpanjang biar aman saat build
  staticPageGenerationTimeout: 100,

  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      'framer-motion',
    ],
  },
  
  images: {
    loader: 'custom',
    loaderFile: './app/lib/cloudinaryLoader.ts',
    // 1. Optimasi: Hapus AVIF (berat), cukup WebP saja
    formats: ['image/webp'], 
    
    // 2. Optimasi: Batasi ukuran resize agar server tidak memproses gambar 4K/8K
    deviceSizes: [640, 750, 828, 1080, 1200], 
    imageSizes: [16, 32, 48, 64, 96],
    
    // 3. Support Logo Brand (SVG)
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",

    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
        port: '',
        pathname: '/**',
      },
      // --- Konfigurasi Cloudinary ---
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      // ------------------------------
    ],
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;