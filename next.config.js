/** @type {import('next').NextConfig} */
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
}

module.exports = nextConfig 