import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      'framer-motion',
    ],
  },
  images: {
    formats: ['image/webp', 'image/avif'],
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