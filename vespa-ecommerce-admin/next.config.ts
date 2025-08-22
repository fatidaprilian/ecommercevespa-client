// file: vespa-ecommerce-admin/next.config.ts

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  
  experimental: {
    optimizePackageImports: [
      'lucide-react', 
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu'
    ],
  },
  
  // --- BLOK INI TELAH DIPERBARUI ---
  images: {
    formats: ['image/webp', 'image/avif'],
    // Menambahkan izin untuk hostname dari Cloudinary
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // -------------------------------
  
  // Mengabaikan error ESLint saat build
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Mengabaikan error TypeScript saat build
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;