/** @type {import('next').NextConfig} */
const nextConfig = {
  // Reduces the image size by creating a standalone `/.next/standalone` folder 
  // that can be deployed without installing `node_modules`.
  output: 'standalone',

  // Experimental features for optimization.
  experimental: {
    // Reduces the bundle size by optimizing how these packages are imported.
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      'framer-motion'
    ],
  },

  // Configuration for Next.js Image Optimization.
  images: {
    // Defines which image formats to use when optimizing.
    // Next.js will serve `webp` or `avif` if the browser supports it.
    formats: ['image/webp', 'image/avif'],

    // Securely allows images from specific external domains.
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
};

module.exports = nextConfig;