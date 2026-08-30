/** @type {import('next').NextConfig} */
const r2Public =
  process.env.R2_PUBLIC_BASE_URL ||
  'https://pub-11e45cf2f593426cbed53b2e53849dd7.r2.dev';

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true
  },
  typescript: {
    ignoreBuildErrors: true
  },
  swcMinify: true,
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  optimizeFonts: true,
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcrypt'],
  },
  env: {
    REGION: 'eu-central-1'
  },
  async rewrites() {
    const base = r2Public.replace(/\/$/, '');
    return [
      {
        source: '/ensik-gemini/:path*',
        destination: `${base}/ensik-gemini/:path*`,
      },
      {
        source: '/seviye-gemini/:path*',
        destination: `${base}/seviye-gemini/:path*`,
      },
      {
        source: '/modul-gemini/:path*',
        destination: `${base}/modul-gemini/:path*`,
      },
      {
        source: '/word-images/:path*',
        destination: `${base}/word-images/:path*`,
      },
    ];
  },
}

module.exports = nextConfig;
