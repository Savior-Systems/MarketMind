/** @type {import('next').NextConfig} */
const isExport = process.env.NEXT_OUTPUT === 'export';

const nextConfig = {
  output: isExport ? 'export' : 'standalone',
  ...(isExport ? {
    basePath: '/MarketMind',
    images: {
      unoptimized: true,
    },
  } : {}),
};

export default nextConfig;
