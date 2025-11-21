import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  
  // Aman: Timeout build diperpanjang
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
    loaderFile: './app/lib/cloudinary-loader.ts',
    // --- SOLUSI TIMEOUT & BLOKIR ISP ---
    // 1. Matikan Image Optimization Server-Side
    // Supaya VPS Anda tidak "double job" (download + resize) yang bikin timeout.
    // Biarkan Cloudinary yang melakukan resize via URL.

    // Settingan di bawah ini (formats, deviceSizes) jadi tidak aktif karena unoptimized: true,
    // tapi biarkan saja tidak apa-apa (diabaikan Next.js).
    formats: ['image/webp'], 
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96],
    
    // Support SVG Brand
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
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
  },

  // --- BAGIAN KRUSIAL UNTUK PROXY ---
  // Ini membuat URL /cdn-images/... di domain Anda
  // diam-diam mengambil data dari Cloudinary.
  async rewrites() {
    return [
      {
        source: '/cdn-images/:path*',
        destination: 'https://res.cloudinary.com/:path*',
      },
    ];
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;