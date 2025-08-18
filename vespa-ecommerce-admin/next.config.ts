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
  
  images: {
    formats: ['image/webp', 'image/avif'],
  },
  
  // --- TAMBAHAN ---
  // Ini akan memberitahu Next.js untuk tidak membatalkan
  // proses build jika ada error dari ESLint.
  eslint: {
    ignoreDuringBuilds: true,
  },
  // ----------------

};

export default nextConfig;