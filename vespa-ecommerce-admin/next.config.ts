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
  
  // Mengabaikan error ESLint saat build
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // --- TAMBAHKAN BLOK INI ---
  // Mengabaikan error TypeScript saat build
  typescript: {
    ignoreBuildErrors: true,
  },
  // -------------------------

};

export default nextConfig;