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
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
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